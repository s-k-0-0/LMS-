import { useState, useEffect } from 'react';
import { Timer, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const MOCK_QUESTIONS = [
  {
    id: '1',
    category: 'Quantitative Aptitude',
    question:
      'A train 120 meters long is running with a speed of 60 km/hr. In what time will it pass a boy who is running at 6 km/hr in the opposite direction?',
    options: ['6.54 sec', '4.44 sec', '6.82 sec', '7.42 sec'],
    correct: '6.54 sec',
    explanation:
      'Relative speed = 60 + 6 = 66 km/hr = 55/3 m/sec. Time = 120 / (55/3) = 6.54 sec'
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
        const newPoints = (profile.points || 0) + score;

        await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', profile.id);
      }
    }
  };

  const q = MOCK_QUESTIONS[currentQ];

  if (isFinished) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FCF9EB] p-6">
        <Card className="max-w-md w-full bg-[#FEFEFE] border border-[#EDE8E6] rounded-3xl shadow-xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-20 w-20 text-[#DDA251]" />

            <CardTitle className="text-3xl font-bold text-[#212224] mt-4">
              Assessment Complete
            </CardTitle>
          </CardHeader>

          <CardContent className="text-center">
            <p className="text-5xl font-bold text-[#293981] mb-2">
              {score}
            </p>

            <p className="text-[#696667] mb-8">
              Total Points Earned
            </p>

            <Button
              className="w-full bg-[#DDA251] hover:bg-[#c89244] text-white rounded-xl py-6 text-lg"
              onClick={() => window.location.reload()}
            >
              Take Another Test
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCF9EB] py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">

          <div>
            <h1 className="text-3xl font-bold text-[#212224]">
              {q.category}
            </h1>

            <p className="text-[#696667] mt-1">
              Question {currentQ + 1} of {MOCK_QUESTIONS.length}
            </p>
          </div>

          {/* TIMER */}
          <div
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-lg font-bold
            ${
              timeLeft <= 10
                ? 'bg-red-100 border-red-400 text-red-600'
                : 'bg-[#FEFEFE] border-[#EDE8E6] text-[#293981]'
            }`}
          >
            <Timer className="h-5 w-5" />

            <span>
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* QUESTION CARD */}
        <Card className="bg-[#FEFEFE] border border-[#EDE8E6] rounded-3xl shadow-lg">

          <CardHeader className="border-b border-[#EDE8E6] pb-6">
            <CardTitle className="text-xl leading-relaxed text-[#212224]">
              {q.question}
            </CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">

            {q.options.map((opt, i) => {

              let btnClass =
                'w-full justify-start text-left rounded-2xl py-7 px-5 border transition-all duration-300 bg-[#FEFEFE] border-[#EDE8E6] hover:border-[#DDA251] hover:bg-[#FCF9EB] text-[#212224]';

              let icon = null;

              if (showExplanation) {

                if (opt === q.correct) {
                  btnClass =
                    'w-full justify-start text-left rounded-2xl py-7 px-5 border bg-green-50 border-green-500 text-green-700';

                  icon = (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                  );

                } else if (opt === selectedOpt) {

                  btnClass =
                    'w-full justify-start text-left rounded-2xl py-7 px-5 border bg-red-50 border-red-400 text-red-700';

                  icon = (
                    <XCircle className="ml-auto h-5 w-5 text-red-600" />
                  );

                } else {

                  btnClass =
                    'w-full justify-start text-left rounded-2xl py-7 px-5 border bg-[#F7F7F7] border-[#EDE8E6] text-[#ABABB5]';
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
                  <span className="mr-3 font-bold text-[#293981]">
                    {String.fromCharCode(65 + i)}.
                  </span>

                  <span className="leading-relaxed">
                    {opt}
                  </span>

                  {icon}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* EXPLANATION */}
        {showExplanation && (
          <div className="mt-6 bg-[#FEFEFE] border border-[#EDE8E6] rounded-3xl p-6 shadow-md">

            <h3 className="text-sm uppercase tracking-widest text-[#DDA251] font-bold mb-3">
              Explanation
            </h3>

            <p className="text-[#424043] leading-relaxed">
              {q.explanation}
            </p>
          </div>
        )}

        {/* NEXT BUTTON */}
        {showExplanation && (
          <div className="flex justify-end mt-6">

            <Button
              onClick={handleNext}
              className="bg-[#293981] hover:bg-[#1f2d66] text-white px-8 py-6 rounded-2xl text-lg"
            >
              {currentQ < MOCK_QUESTIONS.length - 1
                ? 'Next Question'
                : 'Finish Test'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
