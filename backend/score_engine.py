from typing import Optional


def apply_score_to_scores(
    scores: list[int],
    winner_index: int,
    dealer_index: int,
    cost: dict,
    is_tsumo: bool,
    honba: int = 0,
    riichi_sticks: int = 0,
    loser_index: Optional[int] = None,
) -> dict:
    updated_scores = scores.copy()
    honba_ron_bonus = honba * 300
    honba_tsumo_bonus_per_player = honba * 100

    if is_tsumo:
        main_cost = cost.get("main", 0)
        additional_cost = cost.get("additional", 0)
        is_winner_dealer = winner_index == dealer_index

        total_receive = riichi_sticks * 1000
        for i in range(4):
            if i == winner_index:
                continue

            if is_winner_dealer:
                base_payment = main_cost
            else:
                if i == dealer_index:
                    base_payment = main_cost
                else:
                    base_payment = additional_cost

            payment = base_payment + honba_tsumo_bonus_per_player
            updated_scores[i] -= payment
            total_receive += payment

        updated_scores[winner_index] += total_receive
    else:
        if loser_index is None:
            raise ValueError("loser_index is required for ron")

        main_cost = cost.get("main", 0)
        total_gain = main_cost + honba_ron_bonus + riichi_sticks * 1000
        total_loss = main_cost + honba_ron_bonus
        updated_scores[winner_index] += total_gain
        updated_scores[loser_index] -= total_loss

    return {
        "scores": updated_scores,
        "diff": [updated_scores[i] - scores[i] for i in range(4)],
    }
