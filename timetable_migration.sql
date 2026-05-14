-- ═══════════════════════════════════════════════════════════
-- TIMETABLE MIGRATION — run this in pgAdmin
-- ═══════════════════════════════════════════════════════════

-- 1. Shift templates (HR creates these, reused across timetable)
CREATE TABLE IF NOT EXISTS public.work_shifts (
    shift_id   SERIAL PRIMARY KEY,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME        NOT NULL,   -- e.g. 08:00
    end_time   TIME        NOT NULL,   -- e.g. 17:00
    created_by INTEGER REFERENCES public.employees(employee_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Per-employee per-date assignment
CREATE TABLE IF NOT EXISTS public.employee_timetable (
    timetable_id SERIAL PRIMARY KEY,
    employee_id  INTEGER NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
    shift_id     INTEGER NOT NULL REFERENCES public.work_shifts(shift_id),
    work_date    DATE    NOT NULL,
    is_off       BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE = rest/holiday
    created_by   INTEGER REFERENCES public.employees(employee_id),
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_tt_emp_date ON public.employee_timetable(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_tt_date     ON public.employee_timetable(work_date);

-- 3. Default shift templates
INSERT INTO public.work_shifts (shift_name, start_time, end_time) VALUES
    ('Standard 8AM–5PM', '08:00', '17:00'),
    ('Morning 7AM–4PM',  '07:00', '16:00'),
    ('Half Day AM',      '08:00', '13:00')
ON CONFLICT DO NOTHING;

-- 4. Convenience view with 5-min grace period + OT detection
CREATE OR REPLACE VIEW public.v_attendance_status AS
SELECT
    et.timetable_id,
    et.employee_id,
    e.employee_name,
    e.email,
    et.work_date,
    et.is_off,
    ws.shift_id,
    ws.shift_name,
    ws.start_time,
    ws.end_time,
    ea.attendance_id,
    ea.clock_in_time,
    ea.clock_out_time,
    CASE
        WHEN et.is_off                                                          THEN 'rest_day'
        WHEN ea.attendance_id IS NULL AND et.work_date < CURRENT_DATE          THEN 'absent'
        WHEN ea.attendance_id IS NULL                                           THEN 'scheduled'
        WHEN ea.clock_in_time::time <= (ws.start_time + INTERVAL '5 minutes')  THEN 'on_time'
        ELSE                                                                         'late'
    END AS punch_status,
    CASE
        WHEN ea.clock_out_time IS NOT NULL
         AND ea.clock_out_time::time > ws.end_time THEN TRUE
        ELSE FALSE
    END AS is_ot,
    CASE
        WHEN ea.clock_out_time IS NOT NULL
         AND ea.clock_out_time::time > ws.end_time
        THEN ROUND(EXTRACT(EPOCH FROM (ea.clock_out_time::time - ws.end_time)) / 3600.0, 2)
        ELSE 0
    END AS ot_hours
FROM public.employee_timetable et
JOIN public.employees e         ON e.employee_id = et.employee_id
JOIN public.work_shifts ws      ON ws.shift_id   = et.shift_id
LEFT JOIN public.employee_attendance ea
       ON ea.employee_id = et.employee_id
      AND ea.clock_in_time::date = et.work_date;

-- 5. Verify
SELECT 'work_shifts'::text AS table_name, COUNT(*) FROM public.work_shifts
UNION ALL
SELECT 'employee_timetable', COUNT(*) FROM public.employee_timetable;
