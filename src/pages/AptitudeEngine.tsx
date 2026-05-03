import { useState, useEffect } from 'react';
import { Timer, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const MOCK_QUESTIONS = [
  {
    id: '1',
    category: 'Quantitative Aptitude',
    question: 'A train 120 meters long is running with a speed of 60 km/hr. In what time will it pass a boy who is running at 6 km/hr in the direction opposite to that in which the train is going?',
    options: ['6.54 sec', '4.44 sec', '6.82 sec', '7.42 sec'],
    correct: '6.54 sec',
    explanation: 'Relative speed = 60 + 6 = 66 km/hr = 66 * 5/18 = 55/3 m/sec. Time = 120 / (55/3) = 360/55 = 6.54 sec'
  },
  {
    id: '2',
    category: 'Logical Reasoning',
    question: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
    options: ['(1/3)', '(1/8)', '(2/8)', '(1/16)'],
    correct: '(1/8)',
    explanation: 'This is a simple alternating division series; each number is one-half of the previous number.'
  }
];

export default function AptitudeEngine() {
  const { profile } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    if (isFinished || showExplanation) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished, showExplanation]);

  const handleSelect = (opt: string) => {
    if (showExplanation) return;
    setSelectedOpt(opt);
    setShowExplanation(true);
    if (opt === MOCK_QUESTIONS[currentQ].correct) {
      setScore(s => s + 10);
    }
  };

  const handleNext = async () => {
    if (currentQ < MOCK_QUESTIONS.length - 1) {
      setCurrentQ(c => c + 1);
      setTimeLeft(60);
      setSelectedOpt(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
      if (profile && score > 0) {
        // Save score as points for the user
        const newPoints = (profile.points || 0) + score;
        await supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id);
      }
    }
  };

  if (isFinished) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="bg-rose-900 border-rose-800 rounded-2xl text-rose-100 max-w-md w-full text-center py-8 shadow-none shadow-none">
          <CardHeader>
             <CardTitle className="text-2xl font-bold flex flex-col items-center gap-4">
                 <CheckCircle2 className="h-16 w-16 text-pink-500" />
                 Assessment Complete
             </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-4xl font-mono text-pink-400 font-bold mb-2">{score}</p>
             <p className="text-rose-400 font-medium">Total Points Earned</p>
             <Button className="mt-8 bg-pink-500 text-rose-950 font-semibold hover:bg-pink-600 w-full rounded-lg" onClick={() => window.location.reload()}>Take Another Test</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = MOCK_QUESTIONS[currentQ];

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold font-sans text-rose-50">{q.category}</h1>
          <p className="text-sm text-rose-400 font-medium mt-1">Question {currentQ + 1} of {MOCK_QUESTIONS.length}</p>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${timeLeft <= 10 ? 'bg-red-950 border border-red-500/50 text-red-500' : 'bg-rose-900 border border-rose-800 text-rose-300'}`}>
          <Timer className="h-5 w-5" />
          <span>00:{timeLeft.toString().padStart(2, '0')}</span>
        </div>
      </div>

      <Card className="bg-rose-900 border-rose-800 text-rose-100 shadow-none rounded-2xl mb-6">
        <CardHeader className="border-b border-rose-800/50 pb-4 mb-4">
           <CardTitle className="text-lg leading-relaxed">{q.question}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-6">
          {q.options.map((opt, i) => {
            let btnClass = "w-full justify-start py-6 px-4 text-left hover:bg-rose-800 bg-rose-800 border-none rounded-lg text-sm text-white font-medium whitespace-normal h-auto";
            let icon = null;

            if (showExplanation) {
               if (opt === q.correct) {
                 btnClass = "w-full justify-start py-6 px-4 text-left bg-pink-500/20 border border-pink-500 text-pink-400 rounded-lg text-sm font-medium whitespace-normal h-auto";
                 icon = <CheckCircle2 className="h-5 w-5 text-pink-500 ml-auto shrink-0" />;
               } else if (opt === selectedOpt) {
                 btnClass = "w-full justify-start py-6 px-4 text-left bg-red-950 border border-red-700 text-red-100 rounded-lg text-sm font-medium whitespace-normal h-auto";
                 icon = <XCircle className="h-5 w-5 text-red-500 ml-auto shrink-0" />;
               } else {
                 btnClass = "w-full justify-start py-6 px-4 text-left bg-rose-900 border border-rose-800 text-rose-500 rounded-lg text-sm font-medium whitespace-normal h-auto opacity-60";
               }
            }

            return (
              <Button 
                key={i}
                variant="outline"
                className={btnClass}
                onClick={() => handleSelect(opt)}
                disabled={showExplanation}
              >
                 <span className="font-mono text-rose-400 mr-3 shrink-0">{String.fromCharCode(65 + i)}.</span>
                 <span className="leading-snug">{opt}</span>
                 {icon}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {showExplanation && (
        <div className="bg-rose-900 border border-rose-800 rounded-2xl p-6 mb-6 animate-in slide-in-from-bottom-2">
           <h3 className="text-xs uppercase tracking-widest text-pink-500 font-bold mb-2">Explanation</h3>
           <p className="text-rose-300 text-sm leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {showExplanation && (
        <div className="flex justify-end animate-in fade-in">
          <Button onClick={handleNext} className="bg-pink-500 text-rose-950 font-semibold hover:bg-pink-600 px-8 rounded-lg">
             {currentQ < MOCK_QUESTIONS.length - 1 ? 'Next Question' : 'Finish Test'}
          </Button>
        </div>
      )}
    </div>
  );
}
