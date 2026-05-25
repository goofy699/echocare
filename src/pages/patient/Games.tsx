import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, Trophy, Clock, Zap, ArrowLeft } from "lucide-react";
import { languageTools } from "@/lib/languagetools";

// Memory Game
function MemoryGame() {
    const [cards, setCards] = useState<any[]>([]);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [matched, setMatched] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [gameWon, setGameWon] = useState(false);

    useEffect(() => {
        initializeGame();
    }, []);

    const initializeGame = () => {
        const symbols = ["🌟", "🎨", "🎭", "🎪", "🎯", "🎲", "🎸", "🎬"];
        const shuffled = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
        setCards(shuffled.map((symbol, i) => ({ id: i, symbol })));
        setFlipped([]);
        setMatched([]);
        setMoves(0);
        setGameWon(false);
    };

    useEffect(() => {
        if (flipped.length === 2) {
            const [first, second] = flipped;
            if (cards[first]?.symbol === cards[second]?.symbol) {
                setMatched([...matched, first, second]);
                setFlipped([]);
            } else {
                setTimeout(() => setFlipped([]), 600);
            }
            setMoves(moves + 1);
        }
    }, [flipped]);

    useEffect(() => {
        if (matched.length === cards.length && cards.length > 0) {
            setGameWon(true);
        }
    }, [matched, cards]);

    const handleCardClick = (index: number) => {
        if (flipped.includes(index) || matched.includes(index) || flipped.length >= 2) return;
        setFlipped([...flipped, index]);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-4 flex-wrap">
                    <Badge className="bg-blue-100 text-blue-700 px-3 py-1">Moves: {moves}</Badge>
                    <Badge className="bg-green-100 text-green-700 px-3 py-1">Matched: {matched.length}/16</Badge>
                </div>
                <Button onClick={initializeGame} size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-1" />Reset</Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
                {cards.map((card, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleCardClick(idx)}
                        className={`h-20 rounded-lg font-bold text-2xl transition-all ${flipped.includes(idx) || matched.includes(idx)
                            ? "bg-gradient-to-br from-purple-400 to-pink-400 text-white"
                            : "bg-gradient-to-br from-blue-300 to-cyan-300 hover:shadow-lg"
                            }`}
                    >
                        {flipped.includes(idx) || matched.includes(idx) ? card.symbol : "?"}
                    </button>
                ))}
            </div>
            {gameWon && (
                <div className="p-4 rounded-lg bg-green-100 border border-green-400 text-center">
                    <p className="font-bold text-green-700">🎉 You won in {moves} moves!</p>
                </div>
            )}
        </div>
    );
}

// Quick Math Game
function QuickMathGame() {
    const [question, setQuestion] = useState<any>(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [gameActive, setGameActive] = useState(true);

    useEffect(() => {
        generateQuestion();
    }, []);

    useEffect(() => {
        if (!gameActive) return;
        const timer = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    setGameActive(false);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameActive]);

    const generateQuestion = () => {
        const operations = ["+", "-", "*"];
        const op = operations[Math.floor(Math.random() * operations.length)];
        const num1 = Math.floor(Math.random() * 12) + 1;
        const num2 = Math.floor(Math.random() * 12) + 1;

        let answer;
        if (op === "+") answer = num1 + num2;
        else if (op === "-") answer = num1 - num2;
        else answer = num1 * num2;

        setQuestion({ num1, num2, op, answer });
        setUserAnswer("");
    };

    const handleSubmit = () => {
        if (!gameActive) return;
        const correct = parseInt(userAnswer) === question.answer;
        if (correct) {
            setScore(score + 10);
            setStreak(streak + 1);
        } else {
            setStreak(0);
        }
        generateQuestion();
    };

    const startNewGame = () => {
        setScore(0);
        setStreak(0);
        setTimeLeft(30);
        setGameActive(true);
        generateQuestion();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-4 flex-wrap">
                    <Badge className="bg-purple-100 text-purple-700 px-3 py-1"><Trophy className="w-3 h-3 mr-1" />Score: {score}</Badge>
                    <Badge className="bg-orange-100 text-orange-700 px-3 py-1">🔥 Streak: {streak}</Badge>
                    <Badge className="bg-red-100 text-red-700 px-3 py-1"><Clock className="w-3 h-3 mr-1" />{timeLeft}s</Badge>
                </div>
                <Button onClick={startNewGame} size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-1" />New Game</Button>
            </div>
            {gameActive && question ? (
                <div className="space-y-4 p-6 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-purple-400">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-700">
                            {question.num1} {question.op} {question.num2} = ?
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <input
                            type="number"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                            placeholder="Your answer"
                            className="flex-1 min-w-[180px] px-4 py-2 rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            autoFocus
                        />
                        <Button onClick={handleSubmit} className="bg-gradient-to-r from-purple-500 to-pink-500"><Zap className="w-4 h-4 mr-1" />Submit</Button>
                    </div>
                </div>
            ) : (
                <div className="p-6 rounded-lg bg-gradient-to-br from-pink-100 to-red-100 border-2 border-pink-400 text-center">
                    <p className="font-bold text-2xl text-pink-700 mb-2">⏱️ Time's Up!</p>
                    <p className="text-lg text-pink-600 mb-4">Final Score: {score} | Best Streak: {streak}</p>
                    <Button onClick={startNewGame} className="bg-gradient-to-r from-pink-500 to-red-500">Play Again</Button>
                </div>
            )}
        </div>
    );
}

// Word Scramble Game
function WordScrambleGame() {
    const words = ["BRAIN", "MEMORY", "PUZZLE", "INTELLIGENCE", "WISDOM", "FOCUS", "ALERT", "SWIFT", "QUICK", "GENIUS"];
    const [currentWord, setCurrentWord] = useState("");
    const [scrambled, setScrambled] = useState("");
    const [userAnswer, setUserAnswer] = useState("");
    const [score, setScore] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [gameCount, setGameCount] = useState(0);

    useEffect(() => {
        loadNewWord();
    }, []);

    const loadNewWord = () => {
        const word = words[Math.floor(Math.random() * words.length)];
        setCurrentWord(word);
        const scrambledWord = word.split("").sort(() => Math.random() - 0.5).join("");
        setScrambled(scrambledWord);
        setUserAnswer("");
    };

    const handleSubmit = () => {
        const isCorrect = userAnswer.toUpperCase() === currentWord;
        if (isCorrect) {
            setScore(score + 10);
            setCorrect(correct + 1);
        }
        setGameCount(gameCount + 1);
        loadNewWord();
    };

    const resetGame = () => {
        setScore(0);
        setCorrect(0);
        setGameCount(0);
        loadNewWord();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-4 flex-wrap">
                    <Badge className="bg-teal-100 text-teal-700 px-3 py-1"><Trophy className="w-3 h-3 mr-1" />Score: {score}</Badge>
                    <Badge className="bg-cyan-100 text-cyan-700 px-3 py-1">Correct: {correct}/{gameCount || 1}</Badge>
                </div>
                <Button onClick={resetGame} size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-1" />Reset</Button>
            </div>
            <div className="p-6 rounded-lg bg-gradient-to-br from-teal-100 to-cyan-100 border-2 border-teal-400 space-y-4">
                <p className="text-center text-gray-700 font-semibold">Unscramble the word:</p>
                <div className="text-center">
                    <p className="text-3xl font-bold text-teal-700 tracking-widest mb-4">{scrambled}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                        placeholder="Type the word"
                        className="flex-1 min-w-[180px] px-4 py-2 rounded-lg border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                        autoFocus
                    />
                    <Button onClick={handleSubmit} className="bg-gradient-to-r from-teal-500 to-cyan-500"><Zap className="w-4 h-4 mr-1" />Submit</Button>
                </div>
            </div>
        </div>
    );
}

// Pattern Recognition Game
function PatternGame() {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSequence, setUserSequence] = useState<number[]>([]);
    const [level, setLevel] = useState(1);
    const [gameActive, setGameActive] = useState(false);
    const [message, setMessage] = useState("Click Start to begin!");
    const [activeColor, setActiveColor] = useState<number | null>(null);
    const [isShowingSequence, setIsShowingSequence] = useState(false);

    const colors = ["bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400"];

    const playSequence = (seq: number[], onDone?: () => void) => {
        setIsShowingSequence(true);
        let delay = 500;

        seq.forEach((index) => {
            setTimeout(() => {
                setActiveColor(index);
                setTimeout(() => setActiveColor(null), 300);
            }, delay);
            delay += 600;
        });

        setTimeout(() => {
            setIsShowingSequence(false);
            onDone?.();
        }, delay);
    };

    const startGame = () => {
        const newSequence = [Math.floor(Math.random() * 4)];
        setSequence(newSequence);
        setUserSequence([]);
        setLevel(1);
        setGameActive(true);
        setMessage("Watch the pattern!");
        playSequence(newSequence, () => {
            setMessage("Your turn! Repeat the pattern.");
        });
    };

    const handleColorClick = (index: number) => {
        if (!gameActive || isShowingSequence) return;
        const newUserSequence = [...userSequence, index];
        setUserSequence(newUserSequence);

        if (newUserSequence[newUserSequence.length - 1] !== sequence[newUserSequence.length - 1]) {
            setGameActive(false);
            setMessage(`Game Over! You reached level ${level}`);
            return;
        }

        if (newUserSequence.length === sequence.length) {
            const newSequence = [...sequence, Math.floor(Math.random() * 4)];
            setSequence(newSequence);
            setUserSequence([]);
            setLevel(level + 1);
            setMessage(`Level ${level + 1}! Watch the next pattern...`);
            setTimeout(() => {
                playSequence(newSequence, () => {
                    setMessage("Your turn! Repeat the pattern.");
                });
            }, 800);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <Badge className="bg-indigo-100 text-indigo-700 px-3 py-1 text-base">Level: {level}</Badge>
                <Button onClick={startGame} disabled={gameActive} className="bg-gradient-to-r from-indigo-500 to-purple-500">
                    {gameActive ? "Playing..." : "Start Game"}
                </Button>
            </div>
            <div className="p-4 rounded-lg bg-gray-900 text-white text-center font-semibold mb-4">{message}</div>
            <div className="grid grid-cols-2 gap-4">
                {colors.map((color, idx) => (
                    <button
                        key={idx}
                        id={`color-${idx}`}
                        onClick={() => handleColorClick(idx)}
                        disabled={!gameActive || isShowingSequence}
                        className={`${color} h-24 rounded-lg font-bold text-xl transition-all hover:opacity-80 disabled:opacity-50 ${activeColor === idx ? "ring-4 ring-white scale-105" : ""}`}
                    />
                ))}
            </div>
        </div>
    );
}

// Number Sequence Game
function NumberSequenceGame() {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userAnswer, setUserAnswer] = useState("");
    const [score, setScore] = useState(0);
    const [attempts, setAttempts] = useState(0);

    useEffect(() => {
        generateSequence();
    }, []);

    const generateSequence = () => {
        const types = ["arithmetic", "fibonacci", "geometric"];
        const type = types[Math.floor(Math.random() * types.length)];
        let seq: number[] = [];

        if (type === "arithmetic") {
            const start = Math.floor(Math.random() * 10);
            const diff = Math.floor(Math.random() * 5) + 1;
            for (let i = 0; i < 5; i++) seq.push(start + i * diff);
        } else if (type === "fibonacci") {
            seq = [1, 1];
            for (let i = 0; i < 3; i++) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
        } else {
            const start = Math.floor(Math.random() * 5) + 1;
            const ratio = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < 5; i++) seq.push(start * Math.pow(ratio, i));
        }

        setSequence(seq);
        setUserAnswer("");
    };

    const handleSubmit = () => {
        const expected = sequence.length > 0 ? sequence[sequence.length - 1] + (sequence[sequence.length - 1] - sequence[sequence.length - 2]) : 0;
        if (parseInt(userAnswer) === expected) {
            setScore(score + 10);
        }
        setAttempts(attempts + 1);
        generateSequence();
    };

    const resetGame = () => {
        setScore(0);
        setAttempts(0);
        generateSequence();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-4 flex-wrap">
                    <Badge className="bg-amber-100 text-amber-700 px-3 py-1"><Trophy className="w-3 h-3 mr-1" />Score: {score}</Badge>
                    <Badge className="bg-orange-100 text-orange-700 px-3 py-1">Attempts: {attempts}</Badge>
                </div>
                <Button onClick={resetGame} size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-1" />Reset</Button>
            </div>
            <div className="p-6 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-400 space-y-4">
                <p className="text-center text-gray-700 font-semibold">What's the next number in the sequence?</p>
                <div className="flex justify-center gap-2 flex-wrap">
                    {sequence.map((num, idx) => (
                        <div key={idx} className="bg-white rounded-lg px-4 py-2 font-bold text-amber-700 border-2 border-amber-400 text-lg">
                            {num}
                        </div>
                    ))}
                    <div className="bg-gray-200 rounded-lg px-4 py-2 font-bold text-gray-400 border-2 border-gray-400 text-lg">?</div>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <input
                        type="number"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                        placeholder="Your answer"
                        className="flex-1 min-w-[180px] px-4 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                    />
                    <Button onClick={handleSubmit} className="bg-gradient-to-r from-amber-500 to-orange-500"><Zap className="w-4 h-4 mr-1" />Submit</Button>
                </div>
            </div>
        </div>
    );
}

// Main Games Component
export default function PatientGames() {
    const [selectedGame, setSelectedGame] = useState("memory");
    const [isPlaying, setIsPlaying] = useState(false);

    const games = [
        { id: "memory", name: "Memory Match", icon: "🎮", desc: "Flip cards and match pairs", component: MemoryGame },
        { id: "math", name: "Quick Math", icon: "🧮", desc: "Solve math problems fast", component: QuickMathGame },
        { id: "scramble", name: "Word Scramble", icon: "📝", desc: "Unscramble the words", component: WordScrambleGame },
        { id: "pattern", name: "Pattern Master", icon: "🎯", desc: "Follow the color sequence", component: PatternGame },
        { id: "sequence", name: "Number Sequence", icon: "🔢", desc: "Find the next number", component: NumberSequenceGame },
    ];

    const CurrentGame = games.find((g) => g.id === selectedGame)?.component || MemoryGame;
    const currentGameInfo = games.find((g) => g.id === selectedGame);

    const handleGameClick = (gameId: string) => {
        setSelectedGame(gameId);
        setIsPlaying(true);
    };

    // Full-screen game view
    if (isPlaying) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header with back button */}
                    <div className="mb-6">
                        <Button
                            onClick={() => setIsPlaying(false)}
                            variant="outline"
                            size="lg"
                            className="gap-2 mb-6"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Games
                        </Button>
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            {currentGameInfo?.icon} {currentGameInfo?.name}
                        </h1>
                    </div>

                    {/* Game Container */}
                    <Card className="shadow-xl border-0">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">{currentGameInfo?.icon}</span>
                                {currentGameInfo?.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 min-h-96">
                            <CurrentGame />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Game selector view
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Brain className="w-8 h-8 text-purple-600" />
                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Brain Games
                        </h1>
                    </div>
                    <p className="text-gray-600">Train your mind with fun and challenging games!</p>
                </div>

                {/* Game Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {games.map((game) => (
                        <button
                            key={game.id}
                            onClick={() => handleGameClick(game.id)}
                            className="p-4 rounded-xl border-2 transition-all transform hover:scale-105 border-gray-200 bg-white hover:border-purple-300 cursor-pointer"
                        >
                            <div className="text-3xl mb-2">{game.icon}</div>
                            <p className="font-bold text-sm text-gray-800">{game.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{game.desc}</p>
                        </button>
                    ))}
                </div>

                {/* Tips */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-blue-900">💡 Brain Training Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-blue-800 space-y-2">
                        <p>• Play daily for 10-15 minutes to improve cognitive function</p>
                        <p>• Try different games to challenge various brain skills</p>
                        <p>• Progress to harder levels as you improve</p>
                        <p>• Consistent practice helps boost memory and focus!</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
