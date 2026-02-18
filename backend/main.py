from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from mahjong.hand_calculating.hand import HandCalculator
from mahjong.hand_calculating.hand_config import HandConfig, OptionalRules
from mahjong.tile import TilesConverter
from mahjong.constants import EAST, SOUTH, WEST, NORTH
import base64
import os
import json
import re
import time
import secrets
from collections import defaultdict, deque
from openai import OpenAI

app = FastAPI(title="Mahjong Calculator API")

# OpenAI client (環境変数 OPENAI_API_KEY から読み込み)
openai_client = OpenAI() if os.getenv("OPENAI_API_KEY") else None

# Security configuration
API_AUTH_TOKEN = os.getenv("API_AUTH_TOKEN", "").strip()
RECOGNIZE_RATE_LIMIT_COUNT = int(os.getenv("RECOGNIZE_RATE_LIMIT_COUNT", "10"))
RECOGNIZE_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RECOGNIZE_RATE_LIMIT_WINDOW_SECONDS", "60"))
MAX_IMAGE_SIZE_BYTES = int(os.getenv("MAX_IMAGE_SIZE_BYTES", str(5 * 1024 * 1024)))
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

# In-memory, per-IP rate limiter for /recognize
recognize_request_history: dict[str, deque[float]] = defaultdict(deque)

cors_origins_env = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006",
)
allow_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
if "*" in allow_origins and allow_credentials:
    # Invalid + unsafe CORS combination. Force credentials off when wildcard is used.
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 風の変換マップ
WIND_MAP = {"east": EAST, "south": SOUTH, "west": WEST, "north": NORTH}


class TileInput(BaseModel):
    """牌の入力形式"""
    man: str = ""  # 萬子 (例: "123")
    pin: str = ""  # 筒子 (例: "456")
    sou: str = ""  # 索子 (例: "789")
    honors: str = ""  # 字牌 (例: "1234567" = 東南西北白發中)


class MeldInput(BaseModel):
    """副露の入力形式"""
    type: str  # "chi", "pon", "kan", "ankan"
    tiles: TileInput
    opened: bool = True


class CalculateRequest(BaseModel):
    """計算リクエスト"""
    hand: TileInput  # 手牌 (14枚 or 副露分引いた枚数)
    win_tile: TileInput  # 和了牌
    melds: list[MeldInput] = []  # 副露
    dora_indicators: TileInput = TileInput()  # ドラ表示牌
    player_wind: str = "east"  # 自風 (east/south/west/north)
    round_wind: str = "east"  # 場風
    is_tsumo: bool = False  # ツモかロンか
    is_riichi: bool = False  # リーチ
    is_ippatsu: bool = False  # 一発
    is_rinshan: bool = False  # 嶺上開花
    is_chankan: bool = False  # 槍槓
    is_haitei: bool = False  # 海底/河底
    is_daburu_riichi: bool = False  # ダブルリーチ
    is_tenhou: bool = False  # 天和
    is_chiihou: bool = False  # 地和


class ScoreResult(BaseModel):
    """計算結果"""
    han: int
    fu: int
    cost: dict
    yaku: list[dict]
    error: Optional[str] = None


class ApplyScoreRequest(BaseModel):
    """点数適用リクエスト"""
    scores: list[int]  # 4人の現在点 [東, 南, 西, 北]
    winner_index: int  # 和了者のインデックス (0-3)
    loser_index: Optional[int] = None  # 放銃者 (ロンの場合)
    cost: dict  # 点数 (main, additional など)
    is_tsumo: bool
    honba: int = 0  # 本場
    riichi_sticks: int = 0  # 供託リーチ棒


def tiles_to_136(tile_input: TileInput) -> list[int]:
    """TileInputを136形式の牌配列に変換"""
    return TilesConverter.string_to_136_array(
        man=tile_input.man,
        pin=tile_input.pin,
        sou=tile_input.sou,
        honors=tile_input.honors
    )


def verify_api_auth(x_api_key: Optional[str]) -> None:
    """Validate API auth token when API_AUTH_TOKEN is configured."""
    if not API_AUTH_TOKEN:
        return
    if not x_api_key or not secrets.compare_digest(x_api_key, API_AUTH_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


def enforce_recognize_rate_limit(client_ip: str) -> None:
    now = time.time()
    request_times = recognize_request_history[client_ip]

    while request_times and now - request_times[0] > RECOGNIZE_RATE_LIMIT_WINDOW_SECONDS:
        request_times.popleft()

    if len(request_times) >= RECOGNIZE_RATE_LIMIT_COUNT:
        raise HTTPException(status_code=429, detail="Too many requests")

    request_times.append(now)


@app.get("/")
async def root():
    return {"message": "Mahjong Calculator API", "version": "1.0.0"}


@app.post("/calculate", response_model=ScoreResult)
async def calculate_score(request: CalculateRequest, x_api_key: Optional[str] = Header(default=None)):
    """手牌から点数を計算"""
    verify_api_auth(x_api_key)
    try:
        calculator = HandCalculator()

        # 牌を変換
        tiles = TilesConverter.string_to_136_array(
            man=request.hand.man,
            pin=request.hand.pin,
            sou=request.hand.sou,
            honors=request.hand.honors
        )

        win_tile = TilesConverter.string_to_136_array(
            man=request.win_tile.man,
            pin=request.win_tile.pin,
            sou=request.win_tile.sou,
            honors=request.win_tile.honors
        )[0]

        # ドラ
        dora_indicators = TilesConverter.string_to_136_array(
            man=request.dora_indicators.man,
            pin=request.dora_indicators.pin,
            sou=request.dora_indicators.sou,
            honors=request.dora_indicators.honors
        ) if (request.dora_indicators.man or request.dora_indicators.pin or
              request.dora_indicators.sou or request.dora_indicators.honors) else []

        # 副露の変換
        melds = []
        for meld in request.melds:
            from mahjong.meld import Meld
            meld_tiles = TilesConverter.string_to_136_array(
                man=meld.tiles.man,
                pin=meld.tiles.pin,
                sou=meld.tiles.sou,
                honors=meld.tiles.honors
            )
            meld_type = {
                "chi": Meld.CHI,
                "pon": Meld.PON,
                "kan": Meld.KAN,
                "ankan": Meld.KAN
            }.get(meld.type, Meld.PON)
            melds.append(Meld(meld_type, meld_tiles, opened=meld.opened))

        # 設定
        config = HandConfig(
            is_tsumo=request.is_tsumo,
            is_riichi=request.is_riichi,
            is_ippatsu=request.is_ippatsu,
            is_rinshan=request.is_rinshan,
            is_chankan=request.is_chankan,
            is_haitei=request.is_haitei,
            is_daburu_riichi=request.is_daburu_riichi,
            is_tenhou=request.is_tenhou,
            is_chiihou=request.is_chiihou,
            player_wind=WIND_MAP.get(request.player_wind, EAST),
            round_wind=WIND_MAP.get(request.round_wind, EAST),
            options=OptionalRules(
                has_open_tanyao=True,
                has_aka_dora=False,  # 赤ドラは現在未対応（UIで指定できないため）
            )
        )

        # 計算
        result = calculator.estimate_hand_value(
            tiles=tiles,
            win_tile=win_tile,
            melds=melds if melds else None,
            dora_indicators=dora_indicators if dora_indicators else None,
            config=config
        )

        if result.error:
            return ScoreResult(
                han=0,
                fu=0,
                cost={},
                yaku=[],
                error=str(result.error)
            )

        return ScoreResult(
            han=result.han,
            fu=result.fu,
            cost={
                "main": result.cost.get("main", 0) if isinstance(result.cost, dict) else result.cost["main"],
                "additional": result.cost.get("additional", 0) if isinstance(result.cost, dict) else result.cost.get("additional", 0),
                "total": result.cost.get("main", 0) + result.cost.get("additional", 0) * 2 if isinstance(result.cost, dict) else 0
            },
            yaku=[{"name": str(y), "han": y.han_open if melds else y.han_closed} for y in result.yaku]
        )

    except Exception:
        return ScoreResult(
            han=0,
            fu=0,
            cost={},
            yaku=[],
            error="calculation_failed"
        )


@app.post("/apply-score")
async def apply_score(request: ApplyScoreRequest, x_api_key: Optional[str] = Header(default=None)):
    """点数を4人の持ち点に反映"""
    verify_api_auth(x_api_key)
    scores = request.scores.copy()
    honba_bonus = request.honba * 300  # 本場ボーナス

    if request.is_tsumo:
        # ツモの場合
        main_cost = request.cost.get("main", 0)
        additional_cost = request.cost.get("additional", 0)

        for i in range(4):
            if i == request.winner_index:
                # 和了者は全員から受け取る + 供託
                total_receive = main_cost + additional_cost * 2 + honba_bonus + request.riichi_sticks * 1000
                scores[i] += total_receive
            else:
                # 親は main、子は additional を支払う
                if i == 0:  # 親
                    scores[i] -= main_cost + honba_bonus // 3
                else:
                    scores[i] -= additional_cost + honba_bonus // 3
    else:
        # ロンの場合
        main_cost = request.cost.get("main", 0)
        scores[request.winner_index] += main_cost + honba_bonus + request.riichi_sticks * 1000
        if request.loser_index is not None:
            scores[request.loser_index] -= main_cost + honba_bonus

    return {
        "scores": scores,
        "diff": [scores[i] - request.scores[i] for i in range(4)]
    }


class RecognizedTile(BaseModel):
    """認識された牌"""
    id: str  # "1m", "5p", "7z" など
    name: str  # "一萬", "五筒", "中" など
    confidence: float  # 0.0 - 1.0


class RecognitionResponse(BaseModel):
    """認識結果"""
    tiles: list[RecognizedTile]
    raw_response: Optional[str] = None
    error: Optional[str] = None


# 牌名からIDへのマッピング
TILE_NAME_TO_ID = {
    # 萬子
    "一萬": "1m", "二萬": "2m", "三萬": "3m", "四萬": "4m", "五萬": "5m",
    "六萬": "6m", "七萬": "7m", "八萬": "8m", "九萬": "9m",
    "1萬": "1m", "2萬": "2m", "3萬": "3m", "4萬": "4m", "5萬": "5m",
    "6萬": "6m", "7萬": "7m", "8萬": "8m", "9萬": "9m",
    # 筒子
    "一筒": "1p", "二筒": "2p", "三筒": "3p", "四筒": "4p", "五筒": "5p",
    "六筒": "6p", "七筒": "7p", "八筒": "8p", "九筒": "9p",
    "1筒": "1p", "2筒": "2p", "3筒": "3p", "4筒": "4p", "5筒": "5p",
    "6筒": "6p", "7筒": "7p", "8筒": "8p", "9筒": "9p",
    # 索子
    "一索": "1s", "二索": "2s", "三索": "3s", "四索": "4s", "五索": "5s",
    "六索": "6s", "七索": "7s", "八索": "8s", "九索": "9s",
    "1索": "1s", "2索": "2s", "3索": "3s", "4索": "4s", "5索": "5s",
    "6索": "6s", "7索": "7s", "8索": "8s", "9索": "9s",
    # 字牌
    "東": "1z", "南": "2z", "西": "3z", "北": "4z",
    "白": "5z", "發": "6z", "発": "6z", "中": "7z",
}

# IDから牌名へのマッピング
TILE_ID_TO_NAME = {
    "1m": "一萬", "2m": "二萬", "3m": "三萬", "4m": "四萬", "5m": "五萬",
    "6m": "六萬", "7m": "七萬", "8m": "八萬", "9m": "九萬",
    "1p": "一筒", "2p": "二筒", "3p": "三筒", "4p": "四筒", "5p": "五筒",
    "6p": "六筒", "7p": "七筒", "8p": "八筒", "9p": "九筒",
    "1s": "一索", "2s": "二索", "3s": "三索", "4s": "四索", "5s": "五索",
    "6s": "六索", "7s": "七索", "8s": "八索", "9s": "九索",
    "1z": "東", "2z": "南", "3z": "西", "4z": "北",
    "5z": "白", "6z": "發", "7z": "中",
}


def parse_tile_response(response_text: str) -> list[RecognizedTile]:
    """Vision APIのレスポンスから牌リストをパース"""
    tiles = []

    # JSON形式での抽出を試みる
    json_match = re.search(r'\[.*?\]', response_text, re.DOTALL)
    if json_match:
        try:
            tile_list = json.loads(json_match.group())
            for item in tile_list:
                if isinstance(item, str):
                    # "1m", "5p" 形式
                    tile_id = item.lower().strip()
                    if tile_id in TILE_ID_TO_NAME:
                        tiles.append(RecognizedTile(
                            id=tile_id,
                            name=TILE_ID_TO_NAME[tile_id],
                            confidence=0.9
                        ))
                elif isinstance(item, dict):
                    tile_id = item.get("id", "").lower().strip()
                    confidence = item.get("confidence", 0.9)
                    if tile_id in TILE_ID_TO_NAME:
                        tiles.append(RecognizedTile(
                            id=tile_id,
                            name=TILE_ID_TO_NAME[tile_id],
                            confidence=confidence
                        ))
            return tiles
        except json.JSONDecodeError:
            pass

    # テキストから牌名を抽出
    for name, tile_id in TILE_NAME_TO_ID.items():
        count = response_text.count(name)
        for _ in range(count):
            tiles.append(RecognizedTile(
                id=tile_id,
                name=TILE_ID_TO_NAME[tile_id],
                confidence=0.8
            ))

    return tiles


@app.post("/recognize", response_model=RecognitionResponse)
async def recognize_tiles(
    request: Request,
    image: UploadFile = File(...),
    x_api_key: Optional[str] = Header(default=None),
):
    """画像から牌を認識"""
    verify_api_auth(x_api_key)
    client_ip = request.client.host if request.client else "unknown"
    enforce_recognize_rate_limit(client_ip)

    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    # OpenAI APIキーが未設定の場合はダミーデータを返す（開発・テスト用）
    if not openai_client:
        dummy_tiles = [
            RecognizedTile(id="1m", name="一萬", confidence=0.95),
            RecognizedTile(id="2m", name="二萬", confidence=0.92),
            RecognizedTile(id="3m", name="三萬", confidence=0.88),
            RecognizedTile(id="4p", name="四筒", confidence=0.91),
            RecognizedTile(id="5p", name="五筒", confidence=0.75),  # 低信頼度（警告表示テスト用）
            RecognizedTile(id="6p", name="六筒", confidence=0.93),
            RecognizedTile(id="7s", name="七索", confidence=0.89),
            RecognizedTile(id="8s", name="八索", confidence=0.94),
            RecognizedTile(id="9s", name="九索", confidence=0.90),
            RecognizedTile(id="1z", name="東", confidence=0.96),
            RecognizedTile(id="1z", name="東", confidence=0.97),
            RecognizedTile(id="1z", name="東", confidence=0.65),  # 低信頼度
            RecognizedTile(id="7z", name="中", confidence=0.98),
            RecognizedTile(id="7z", name="中", confidence=0.99),  # 和了牌
        ]
        return RecognitionResponse(
            tiles=dummy_tiles,
            raw_response="[DUMMY MODE] OpenAI API key not configured. Returning test data."
        )

    try:
        # 画像をBase64エンコード
        image_content = await image.read()
        if len(image_content) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="Image too large")
        base64_image = base64.b64encode(image_content).decode("utf-8")

        # Vision APIに送信
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """あなたは麻雀牌を認識する専門家です。
画像に写っている麻雀牌を左から右の順番で識別してください。

出力形式は必ず以下のJSON配列のみを返してください：
["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1z", "1z", "1z", "7z", "7z"]

牌のID形式：
- 萬子: 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m
- 筒子: 1p, 2p, 3p, 4p, 5p, 6p, 7p, 8p, 9p
- 索子: 1s, 2s, 3s, 4s, 5s, 6s, 7s, 8s, 9s
- 字牌: 1z(東), 2z(南), 3z(西), 4z(北), 5z(白), 6z(發), 7z(中)

注意：
- 同じ牌が複数ある場合は、その数だけIDを繰り返してください
- 確認できない牌がある場合は "?" を使ってください
- JSON配列のみを出力し、他の説明は不要です"""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "この画像の麻雀牌を左から順番に識別してください。JSON配列で返してください。"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )

        raw_response = response.choices[0].message.content or ""
        tiles = parse_tile_response(raw_response)

        return RecognitionResponse(
            tiles=tiles,
            raw_response=raw_response
        )

    except HTTPException:
        raise
    except Exception as e:
        # Keep detailed error in server logs, return generic message to clients.
        print(f"/recognize failed: {e}")
        return RecognitionResponse(
            tiles=[],
            error="recognition_failed"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
