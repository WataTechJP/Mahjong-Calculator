import pytest
from score_engine import apply_score_to_scores


def test_ron_basic_with_honba_and_riichi_sticks():
    result = apply_score_to_scores(
        scores=[25000, 25000, 25000, 25000],
        winner_index=1,
        loser_index=2,
        dealer_index=0,
        cost={"main": 3900, "additional": 0},
        is_tsumo=False,
        honba=1,
        riichi_sticks=1,
    )

    assert result["scores"][1] == 30200
    assert result["scores"][2] == 20800
    assert result["scores"][0] == 25000
    assert result["scores"][3] == 25000
    assert sum(result["diff"]) == 1000


def test_tsumo_dealer():
    result = apply_score_to_scores(
        scores=[25000, 25000, 25000, 25000],
        winner_index=0,
        dealer_index=0,
        cost={"main": 2000, "additional": 2000},
        is_tsumo=True,
        honba=1,
        riichi_sticks=0,
    )

    assert result["scores"] == [31300, 22900, 22900, 22900]
    assert sum(result["diff"]) == 0


def test_tsumo_non_dealer_with_nonzero_dealer_index():
    result = apply_score_to_scores(
        scores=[25000, 25000, 25000, 25000],
        winner_index=2,
        dealer_index=1,
        cost={"main": 2000, "additional": 1000},
        is_tsumo=True,
        honba=2,
        riichi_sticks=0,
    )

    assert result["scores"] == [23800, 22800, 29600, 23800]
    assert sum(result["diff"]) == 0


def test_ron_requires_loser_index():
    with pytest.raises(ValueError):
        apply_score_to_scores(
            scores=[25000, 25000, 25000, 25000],
            winner_index=0,
            dealer_index=0,
            cost={"main": 1000, "additional": 0},
            is_tsumo=False,
            honba=0,
            riichi_sticks=0,
        )
