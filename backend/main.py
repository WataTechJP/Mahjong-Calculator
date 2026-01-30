from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from mahjong.hand_calculating.hand import HandCalculator
from mahjong.hand_calculating.hand_config import HandConfig, OptionalRules
from mahjong.tile import TilesConverter
from mahjong.constants import EAST, SOUTH, WEST, NORTH

app = FastAPI(title="Mahjong Calculator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.get("/")
async def root():
    return {"message": "Mahjong Calculator API", "version": "1.0.0"}


@app.post("/calculate", response_model=ScoreResult)
async def calculate_score(request: CalculateRequest):
    """手牌から点数を計算"""
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
                has_aka_dora=True,
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

    except Exception as e:
        return ScoreResult(
            han=0,
            fu=0,
            cost={},
            yaku=[],
            error=str(e)
        )


@app.post("/apply-score")
async def apply_score(request: ApplyScoreRequest):
    """点数を4人の持ち点に反映"""
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


@app.post("/recognize")
async def recognize_tiles(image: UploadFile = File(...)):
    """画像から牌を認識（将来実装）"""
    # TODO: 画像認識の実装
    return {
        "recognized": [],
        "confidence": 0.0,
        "message": "Image recognition not yet implemented"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
