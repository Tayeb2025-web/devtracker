import { useState, useEffect } from 'react';
import { challengeApi } from '../services/api';
import { Card, ProgressBar, LoadingSpinner, Badge } from '../components/ui';
import { formatAfghanDate } from '../constants';
import { HiOutlineSparkles, HiOutlineFlag } from 'react-icons/hi';

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    challengeApi.getAll().then(res => setChallenges(res.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-7">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Goals</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Study Challenges</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">Push yourself with custom coding and study challenges</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map(challenge => {
          const isCompleted = challenge.status === 'completed';

          return (
            <Card
              key={challenge.id}
              className={`animate-fade-in transition-all duration-300 ${
                isCompleted ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-surface-light to-teal-500/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-text flex items-center gap-2">
                  <HiOutlineFlag className={isCompleted ? 'text-emerald-400' : 'text-indigo-400'} size={18} />
                  {challenge.challenge_name}
                </h3>
                {isCompleted ? (
                  <Badge color="accent">Completed!</Badge>
                ) : (
                  <Badge color="primary">Active</Badge>
                )}
              </div>
              <p className="text-text-muted text-xs leading-relaxed mb-4">{challenge.challenge_description}</p>
              <ProgressBar
                value={challenge.current_value}
                max={challenge.target_value}
                color={isCompleted ? 'accent' : 'primary'}
                height="h-2.5"
              />
              <div className="flex items-center justify-between text-xs text-text-muted mt-2 font-medium">
                <span>Progress</span>
                <span className="font-bold text-text">{challenge.current_value} / {challenge.target_value} {challenge.unit}</span>
              </div>
              {isCompleted && challenge.completed_at && (
                <p className="text-emerald-400 text-[11px] font-semibold mt-3 pt-2 border-t border-border/40">
                  Completed on {formatAfghanDate(challenge.completed_at)}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
