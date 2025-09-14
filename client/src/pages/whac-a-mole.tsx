import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Hammer, Trophy, RotateCcw, Play, Pause } from "lucide-react";
import { useLocation } from "wouter";

// Northern Ireland political parties
const PARTIES = [
  { id: 'dup', name: 'DUP', color: 'bg-red-600', points: 10 },
  { id: 'sf', name: 'SF', color: 'bg-green-600', points: 10 },
  { id: 'uup', name: 'UUP', color: 'bg-blue-600', points: 15 },
  { id: 'sdlp', name: 'SDLP', color: 'bg-green-500', points: 15 },
  { id: 'alliance', name: 'Alliance', color: 'bg-yellow-500', points: 20 },
  { id: 'tuv', name: 'TUV', color: 'bg-red-700', points: 25 },
  { id: 'pbp', name: 'PBP', color: 'bg-pink-600', points: 30 },
  { id: 'green', name: 'Green', color: 'bg-green-700', points: 30 },
];

interface Mole {
  id: string;
  position: number;
  party: typeof PARTIES[0];
  isVisible: boolean;
  isHit: boolean;
}

export default function WhacAMoleGame() {
  const [location, setLocation] = useLocation();
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('whacMoleHighScore');
    return saved ? parseInt(saved) : 0;
  });
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [combo, setCombo] = useState(0);
  const [lastHit, setLastHit] = useState<string | null>(null);
  const gameInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize holes (9 holes in a 3x3 grid)
  const holes = Array.from({ length: 9 }, (_, i) => i);

  // Start game
  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setIsPlaying(true);
    setCombo(0);
    setMoles([]);
    setLastHit(null);
  };

  // End game
  const endGame = () => {
    setIsPlaying(false);
    if (gameInterval.current) {
      clearInterval(gameInterval.current);
      gameInterval.current = null;
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    
    // Update high score
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('whacMoleHighScore', score.toString());
    }
    
    setMoles([]);
  };

  // Spawn moles randomly
  useEffect(() => {
    if (isPlaying) {
      gameInterval.current = setInterval(() => {
        setMoles(prevMoles => {
          // Remove old moles
          const activeMoles = prevMoles.filter(m => !m.isHit && Date.now() - parseInt(m.id.split('-')[1]) < 2000);
          
          // Randomly spawn new mole
          if (Math.random() < 0.7 && activeMoles.length < 4) {
            const availablePositions = holes.filter(h => !activeMoles.some(m => m.position === h));
            if (availablePositions.length > 0) {
              const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
              const party = PARTIES[Math.floor(Math.random() * PARTIES.length)];
              const newMole: Mole = {
                id: `mole-${Date.now()}`,
                position,
                party,
                isVisible: true,
                isHit: false,
              };
              return [...activeMoles, newMole];
            }
          }
          
          return activeMoles;
        });
      }, 800);

      // Timer countdown
      timerInterval.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (gameInterval.current) clearInterval(gameInterval.current);
        if (timerInterval.current) clearInterval(timerInterval.current);
      };
    }
  }, [isPlaying]);

  // Handle whacking a mole
  const whackMole = (mole: Mole) => {
    if (!isPlaying || mole.isHit) return;

    // Mark as hit
    setMoles(prev => prev.map(m => 
      m.id === mole.id ? { ...m, isHit: true } : m
    ));

    // Calculate score with combo
    const basePoints = mole.party.points;
    const comboMultiplier = Math.min(combo + 1, 5); // Max 5x combo
    const points = basePoints * comboMultiplier;
    
    setScore(prev => prev + points);
    
    // Update combo
    if (lastHit === mole.party.id) {
      setCombo(prev => Math.min(prev + 1, 4)); // Max combo of 5
    } else {
      setCombo(0);
    }
    setLastHit(mole.party.id);

    // Visual feedback
    const button = document.getElementById(`hole-${mole.position}`);
    if (button) {
      button.classList.add('animate-bounce');
      setTimeout(() => button.classList.remove('animate-bounce'), 300);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Hammer className="text-primary-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Whac-A-Politician</h1>
                <p className="text-xs text-muted-foreground">Northern Ireland Edition</p>
              </div>
            </div>
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
              size="sm"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Game Stats */}
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                  Game Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Score</p>
                  <p className="text-3xl font-bold text-primary">{score}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High Score</p>
                  <p className="text-2xl font-semibold">{highScore}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Left</p>
                  <p className="text-2xl font-semibold">{timeLeft}s</p>
                </div>
                {combo > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Combo</p>
                    <p className="text-xl font-semibold text-orange-500">{combo + 1}x</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!isPlaying ? (
                  <Button 
                    onClick={startGame}
                    className="w-full"
                    size="lg"
                    data-testid="button-start-game"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Game
                  </Button>
                ) : (
                  <Button 
                    onClick={endGame}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                    data-testid="button-end-game"
                  >
                    <Pause className="mr-2 h-5 w-5" />
                    End Game
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    setScore(0);
                    setTimeLeft(60);
                    setCombo(0);
                    setMoles([]);
                    setLastHit(null);
                    setIsPlaying(false);
                  }}
                  variant="outline"
                  className="w-full"
                  data-testid="button-reset-game"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Point Values</CardTitle>
                <CardDescription>Hit parties for points!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {PARTIES.map(party => (
                  <div key={party.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full ${party.color} flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{party.name.slice(0, 2)}</span>
                      </div>
                      <span className="text-sm">{party.name}</span>
                    </div>
                    <Badge variant="secondary">{party.points} pts</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Game Board */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Game Board</CardTitle>
                <CardDescription>
                  Click the party badges as they pop up! Build combos by hitting the same party multiple times.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 aspect-square max-w-md mx-auto">
                  {holes.map(position => {
                    const mole = moles.find(m => m.position === position && !m.isHit);
                    return (
                      <button
                        key={position}
                        id={`hole-${position}`}
                        onClick={() => mole && whackMole(mole)}
                        disabled={!isPlaying}
                        className={`
                          relative aspect-square rounded-full border-4 border-border
                          bg-gradient-to-b from-amber-700 to-amber-900
                          flex items-center justify-center text-4xl font-bold
                          transition-all duration-200 transform
                          ${isPlaying ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-50'}
                          ${mole && !mole.isHit ? 'shadow-lg' : 'shadow-inner'}
                        `}
                        data-testid={`hole-${position}`}
                      >
                        {mole && !mole.isHit ? (
                          <div 
                            className={`
                              absolute inset-2 rounded-full ${mole.party.color}
                              flex items-center justify-center text-white
                              animate-in zoom-in-50 duration-200
                              shadow-xl hover:shadow-2xl
                            `}
                          >
                            <span className="text-lg font-bold">{mole.party.name}</span>
                          </div>
                        ) : (
                          <div className="absolute inset-4 rounded-full bg-black/50" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {!isPlaying && score > 0 && (
                  <div className="mt-6 text-center">
                    <h3 className="text-xl font-semibold mb-2">Game Over!</h3>
                    <p className="text-muted-foreground">
                      Final Score: <span className="text-primary font-bold">{score}</span>
                    </p>
                    {score > highScore && (
                      <Badge variant="default" className="mt-2">
                        <Trophy className="mr-1 h-3 w-3" />
                        New High Score!
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}