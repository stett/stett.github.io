---
title: Rationality and the Game of Clue
layout: post
math: true
---

# Rules

## Composition of the Game

The game of clue is made up of the following components.

1. $$P$$ players, from three to six.
2. Character, weapon, and room cards, numbering $$C$$, $$W$$, and $$R$$ resepctively. These are typically six, six, and nine, totalling twenty-one.

## Setup of the Game

1. One card of each type is randomly selected. This is the solution set $$S={s_C, s_W, s_R}$$ a set of indices into the lists of character, weapon, and room cards.
2. The remaining cards are mixed together, shuffled, distributed as evenly as possible among the players (if $$P$$ does not even divide $$S+W+R-3$$ then some players may have a difference of one card).

## End Condition

1. During the course of play, a player develops a hypothesis $$H={h_C, h_W, h_R}$$, which is a set of indices into the lists of character weapon and room cards.
2. Player A may presents their hypothesis to the other players. If player B owns a card which is in the hypothesis set, then they must reveal this card to player A, proving that $$H!=S$$.
3. If no player can prove that $$H!=S$$, then $$H=S$$ the game is over, going to the player who proposed $$H$$.

# Probabilities

## Hypothesis probability computation

At any point, the player has a set of known "innocent" character, weapon, and room cards $$K={K_C, K_W, K_R}$$. This is a set of sets of indices. This must be used to compute the probability $$P\lparen{H=S}\rparen$$ that a hypothesis is equal to the solution set. When this probability is sufficiently low for the player's level of risk tolerance, they may choose to propose $$H$$.

Assuming that we do not make a hypothesis which includes any known elements, the probability that a component of a hypothesis is correct is (using the character component for concreteness)

$$
P\lparen{h_C=s_C}\rparen = \frac{1}{C - \lvert{K_C}\rvert}.
$$

That is, the probability that our hypothesis for any component is correct is one over the number of cards of that type minus the number of cards of that type which we have eliminated. The probability that two components of the hypothesis are both correct is the product of the probabilities of those two components. Therefore the probability that the entire hypothesis is correct is

$$
P\lparen{H=S}\rparen = \frac{1}{C - \lvert{K_C}\rvert} \times \frac{1}{W - \lvert{K_W}\rvert} \times \frac{1}{R - \lvert{K_R}\rvert}
$$