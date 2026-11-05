import { PLANNER_MAX_MINUTES, PLANNER_STEP_MINUTES, useTime } from '../time/TimeProvider';
import { zoned } from '../time/zoned';

export function MeetingPlanner({ homeZone, hour12 }: { homeZone: string; hour12: boolean }) {
  const { plannerMinutes, setPlannerMinutes, instant } = useTime();
  const previewing = plannerMinutes > 0;
  return (
    <section className={`planner${previewing ? ' planner--active' : ''}`} aria-label="Meeting planner">
      <div className="planner__head">
        <strong>Meeting planner</strong>
        {previewing ? (
          <span className="planner__preview" role="status">
            Previewing {zoned(homeZone, instant).toFormat(hour12 ? 'ccc h:mm a' : 'ccc HH:mm')} (your time)
          </span>
        ) : (
          <span className="planner__hint">Drag to preview a later time. Every clock follows.</span>
        )}
        {previewing && (
          <button type="button" className="btn btn--small" onClick={() => setPlannerMinutes(0)}>
            Back to now
          </button>
        )}
      </div>
      <input
        type="range"
        className="planner__range"
        aria-label="Meeting planner"
        min={0}
        max={PLANNER_MAX_MINUTES}
        step={PLANNER_STEP_MINUTES}
        value={plannerMinutes}
        aria-valuetext={previewing ? `+${Math.floor(plannerMinutes / 60)}h ${plannerMinutes % 60}m` : 'Now'}
        onChange={(e) => setPlannerMinutes(Number(e.target.value))}
      />
      <div className="planner__scale" aria-hidden="true">
        <span>Now</span>
        <span>+6h</span>
        <span>+12h</span>
        <span>+18h</span>
        <span>+24h</span>
      </div>
    </section>
  );
}
