---
title: Rationality and the Game of Clue
layout: post
math: true
---

Some games when broken down into their raw components of probability and choice become practically deterministic. When a "best move" is known (or can be computed) for every possible configuration of the game, then a perfectly dull little algorithm can be made which makes the moves for the player, upping the odds of that player winning, but also upping the odds that they might begin to question the value of their agency.

I think that the development of such an algorithm for games which involve probabilities and unkowns is an interesting pursuit, and is worth a small moment of existential insecurity here and there.

And so here we are, thinking about the game of Clue, wherein middle class family members take up roles as an array of paranoid mystery novel stereotypes and accuse each other of brutal violence. I imagine this game could be made much more interesting to play simply by changing up or adding more categories of clue cards - for example, rather than being limited to hypotheses such as "Ms. Scarlet, in the Library, with a Candlestick", all of which are about murder, you might add various categories of crime or deed, replace the players with historical figures, perhaps add motivations. Players might be prompted to utter historical incongruencies like "Abraham Lincoln, Making a porno, in the Library, with a Candlestick". Far more interesting.

In order to leave the door open to such things, I'll use a generalized representation of the game, where there may be any number of categories of clue card, and any number of cards in each category.

But what happens if we begin to add categories of cards? Does the game become unplayably long? With the original numbers, can we develop an algorithm which will tell us the best possible move to make in every situation?

These are the questions I'm attempting to address in this article.

# Rules

## Composition of the Game

The game of clue is made up of the following components.

1. A number $$P$$ of players.
2. A set $$C = \{ C_1, C_2, ... \}$$ of numbers of clue cards of different categories.

In a regular game, there are three to six players and three types of cards so that the cardinality of the set is $$\lvert{C}\rvert=3$$. There are normally six character cards, six weapon cards, and nine room cards. In other words, a normal game has

$$
\begin{aligned}
    3 \le &P \le 6 \\
    &C = \{ 6, 6, 9 \}.
\end{aligned}
$$

## Setup of the Game

1. One card of each type is randomly selected. This is the solution set $$S=\{s_1, s_2, ..., s_{\lvert{C}\rvert}\}$$ a set of indices into the clue card sets $$C$$.
2. The remaining cards are mixed together, shuffled, distributed as evenly as possible among the players (if $$P$$ does not even divide the number of remaining cards not in the solution set $$\lparen\sum_{i=1}^{\lvert{C}\rvert}C_i\rparen-\lvert{C}\rvert$$ then some players may have a difference of one card).

## End Condition

1. During the course of play, a player develops a hypothesis $$H=\{h_0, h_1, ..., h_{\lvert{C}\rvert}\}$$, which is a set of indices into the clue card sets $$C$$.
2. Player A may presents their hypothesis to the other players. If player B owns a card which is in the hypothesis set, then they must reveal this card to player A, proving that $$H!=S$$.
3. If no player can prove that $$H!=S$$, then $$H=S$$ the game goes to the player who proposed $$H$$.

# Probabilities

## Hypothesis probability computation

At any point, the player has a set of known "innocent" character, weapon, and room cards $$K=\{K_0, K_1, ..., K_{\lvert{C}\rvert}\}$$. This is a set of sets of indices into the clue card sets $$C$$. This can be used to compute the probability $$P\lparen{H=S}\rparen$$ that a hypothesis is equal to the solution set. When this probability is sufficiently low, the hypothesizing player may choose to propose $$H$$ in an attempt to end the game.

Note that the cardinality of a known subset $$\lvert{K}\rvert$$ is _the number of of cards which we know are not in the solution set_.

Assuming that we do not make a hypothesis which includes any known elements, the probability that component $$i$$ of a hypothesis is correct is

$$
P\lparen{h_i=s_i}\rparen = \frac{1}{C_i - \lvert{K_i}\rvert}.
$$

That is, the probability that one particular component of our hypothesis is correct is one out of the number of cards of that type minus the number of cards of that type which we have eliminated.

Put more concretely, if there are six weapon cards, but we have seen two of them (and therefore know that the solution set cannot contain those two), then the solution set must contain one of the four remaining weapons. The probability that we get the weapon correct for any of our hypotheses must be 25%.

The combined probability that all of the components of our hypothesis are correct is the product of their individual probabilities.

$$
P\lparen{H=S}\rparen = \prod_{i=1}^{\lvert{C}\rvert} \frac{1}{C_i - \lvert{K_i}\rvert}
$$

_We now have a method for evaluating the probability that any particular hypothesis will win us the game!_ How very exciting. Now that we've got all this setup and notational nonsense out of the way, we can start to think about strategy and choice.
