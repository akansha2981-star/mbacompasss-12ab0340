-- Refresh ABBS Key Highlights to match official 2027-29 facts
UPDATE public.colleges
SET
  highlights = jsonb_build_array(
    'Established in 2008; autonomous AICTE-approved B-school in Bengaluru',
    'NAAC ''A'' Grade, IACBE & SAQS accredited; AIU member',
    '160+ recruiters; average CTC 7.6 LPA, highest 22.5 LPA',
    '90%+ placement success with 70% PPO conversions after internships',
    'Student exchange with Daito Bunka (Japan), HELP (Malaysia) & Rabat Business School (Morocco)',
    'Industry partnerships with KPMG and Bombay Stock Exchange'
  ),
  updated_at = now()
WHERE id = 'e5cb9248-f100-444f-8844-375d5d1518cb';