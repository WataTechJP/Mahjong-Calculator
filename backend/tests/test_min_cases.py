import unittest
from score_engine import apply_score_to_scores


class ApplyScoreMinCasesTest(unittest.TestCase):
    def test_ron_basic_with_honba_and_riichi_sticks(self):
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

        # winner + (main + honba*300 + riichi*1000)
        self.assertEqual(result["scores"][1], 30200)
        # loser - (main + honba*300)
        self.assertEqual(result["scores"][2], 20800)
        # others unchanged
        self.assertEqual(result["scores"][0], 25000)
        self.assertEqual(result["scores"][3], 25000)
        # total should increase only by riichi sticks from table (already deposited before win)
        self.assertEqual(sum(result["diff"]), 1000)

    def test_tsumo_dealer(self):
        result = apply_score_to_scores(
            scores=[25000, 25000, 25000, 25000],
            winner_index=0,
            dealer_index=0,
            cost={"main": 2000, "additional": 2000},
            is_tsumo=True,
            honba=1,
            riichi_sticks=0,
        )

        # each non-winner pays 2000 + 100
        self.assertEqual(result["scores"], [31300, 22900, 22900, 22900])
        self.assertEqual(sum(result["diff"]), 0)

    def test_tsumo_non_dealer_with_nonzero_dealer_index(self):
        result = apply_score_to_scores(
            scores=[25000, 25000, 25000, 25000],
            winner_index=2,  # west wins
            dealer_index=1,  # south is dealer
            cost={"main": 2000, "additional": 1000},
            is_tsumo=True,
            honba=2,
            riichi_sticks=0,
        )

        # dealer (index 1) pays main + 200, others pay additional + 200
        self.assertEqual(result["scores"], [23800, 22800, 29600, 23800])
        self.assertEqual(sum(result["diff"]), 0)

    def test_ron_requires_loser_index(self):
        with self.assertRaises(ValueError):
            apply_score_to_scores(
                scores=[25000, 25000, 25000, 25000],
                winner_index=0,
                dealer_index=0,
                cost={"main": 1000, "additional": 0},
                is_tsumo=False,
                honba=0,
                riichi_sticks=0,
            )


if __name__ == "__main__":
    unittest.main()
