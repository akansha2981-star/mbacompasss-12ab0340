-- ABBS School of Management Bangalore: refresh stats & content for the 2027-29 admission cycle.
-- Sources: official ABBS website (abbs.edu.in) placement page + official screenshots provided by admin.

UPDATE public.colleges
SET
  established = 2008,
  accreditations = ARRAY['AICTE Approved', 'NAAC ''A'' Grade', 'IACBE Accredited', 'SAQS Accredited', 'AIU Member'],
  placement_avg = '7.6 LPA',
  placement_highest = '22.5 LPA',
  placement_median = '6.12 LPA',
  website = 'https://www.abbs.edu.in',
  meta_title = 'ABBS School of Management Bangalore: PGDM Fees, Placements & Admission 2027-29',
  meta_description = 'ABBS School of Management Bangalore (Acharya Bangalore B-School) PGDM admissions 2027-29: fees, 160+ recruiters, 7.6 LPA average & 22.5 LPA highest package, ABBSSAT, eligibility and how to apply.',
  updated_at = now()
WHERE id = 'e5cb9248-f100-444f-8844-375d5d1518cb';

-- Admission section: official 5-step process + admin-managed application portal link
UPDATE public.college_sections
SET
  title = 'ABBS School of Management Bangalore Admissions 2027-29',
  content = $c$<p>Admission to the PGDM programs at ABBS School of Management (Acharya Bangalore B-School) for the <strong>2027-29 batch</strong> follows a simple, fully online five-step process. Candidates can apply with CAT, XAT, MAT, CMAT, GMAT, KMAT or Karnataka PGCET scores, or appear for the institute's own <strong>ABBSSAT</strong> (ABBS Scholastic Aptitude Test).</p>
<p><strong>Eligibility:</strong> A recognised bachelor's degree with at least 50% aggregate marks (45% for reserved categories). Final-year graduation students may apply provisionally.</p>
<p>After the application is submitted, shortlisted candidates go through the ABBSSAT entrance test and a personal interview with the admissions committee before the final admission decision is communicated by the admissions office.</p>$c$,
  data = jsonb_build_object(
    'applyUrl', 'https://application.abbs.edu.in/abbs-goi?utm_source=Bschoolbuzz&utm_medium=Online&utm_campaign=PANINDIA&utm_id=ABBS',
    'applyLabel', 'Fill Application Form',
    'steps', jsonb_build_array(
      jsonb_build_object('title', 'Fill in the online application form', 'description', 'Complete the application on the official ABBS admissions portal with your preferred entrance test score.'),
      jsonb_build_object('title', 'Upload required documents', 'description', 'Transcripts, ID proof, entrance scorecard and other supporting documents.'),
      jsonb_build_object('title', 'Complete the ABBSSAT entrance test', 'description', 'The ABBS Scholastic Aptitude Test for PG programs, unless a valid national test score is submitted.'),
      jsonb_build_object('title', 'Personal interview', 'description', 'Interview with the admissions committee, where applicable.'),
      jsonb_build_object('title', 'Admission decision', 'description', 'Await the final decision from the ABBS admissions office and confirm your seat.')
    ),
    'eligibility', jsonb_build_array(
      jsonb_build_object('text', 'Bachelor''s degree with minimum 50% marks (45% for reserved categories)'),
      jsonb_build_object('text', 'Valid CAT / XAT / MAT / CMAT / GMAT / KMAT / PGCET score, or ABBSSAT'),
      jsonb_build_object('text', 'Final-year graduation students can apply provisionally')
    )
  ),
  updated_at = now()
WHERE id = 'bd24f873-a23f-4739-80bb-0dcf1a5c1926';

-- Placements section: official 2024 highlights + year-wise trends
UPDATE public.college_sections
SET
  title = 'Placements at ABBS School of Management Bangalore',
  content = $c$<p>ABBS School of Management reports a strong placement record with <strong>160+ recruiting companies</strong> visiting the campus. The latest placement cycle recorded an <strong>average CTC of 7.6 LPA</strong> and a <strong>highest CTC of 22.5 LPA</strong>, with top recruiters including Amazon, KPMG, Deloitte, Infosys, Wipro and Accenture.</p>
<p><strong>Director''s top placement highlights:</strong></p>
<ul>
 <li>30% of students secure jobs in tier-1 companies</li>
 <li>40% of students are placed in BFSI &amp; financial sector roles</li>
 <li>70% PPO conversions after internships</li>
 <li>77%+ of students are placed and onboarded from the 4th semester itself</li>
 <li>Domain-specific placements focused on each student''s interest area, supported by HR forums like NHRWA and HRST</li>
</ul>
<p>ABBS also provides 100% placement assistance to international students, including internships and industry training support.</p>$c$,
  data = jsonb_build_object(
    'placement_rate', '90%+',
    'yearly', jsonb_build_array(
      jsonb_build_object('year', '2024', 'average', '7.56 LPA', 'median', '6.12 LPA', 'highest', '16.43 LPA'),
      jsonb_build_object('year', '2023', 'average', '7.72 LPA', 'median', '6 LPA', 'highest', '13.58 LPA'),
      jsonb_build_object('year', '2022', 'average', '7.64 LPA', 'median', '7 LPA', 'highest', '23 LPA')
    ),
    'sectors', jsonb_build_array(
      jsonb_build_object('sector', 'BFSI & Financial Services', 'percentage', '40'),
      jsonb_build_object('sector', 'Tier-1 Companies', 'percentage', '30'),
      jsonb_build_object('sector', 'IT & Consulting', 'percentage', '20'),
      jsonb_build_object('sector', 'FMCG & Others', 'percentage', '10')
    ),
    'recruiters', jsonb_build_array(
      jsonb_build_object('name', 'Amazon'), jsonb_build_object('name', 'KPMG'), jsonb_build_object('name', 'Deloitte'),
      jsonb_build_object('name', 'Infosys'), jsonb_build_object('name', 'Wipro'), jsonb_build_object('name', 'Accenture'),
      jsonb_build_object('name', 'EY'), jsonb_build_object('name', 'Capgemini'), jsonb_build_object('name', 'HDFC Bank'),
      jsonb_build_object('name', 'ICICI Bank'), jsonb_build_object('name', 'Flipkart'), jsonb_build_object('name', 'Nestle')
    )
  ),
  updated_at = now()
WHERE id = 'b66bb4eb-b13f-4b9b-b783-5022016fd6a8';

-- Why Join section: official introduction + 5 reasons + global exchange
UPDATE public.college_sections
SET
  title = 'Why Join ABBS School of Management Bangalore',
  content = $c$<p>Established in <strong>2008</strong>, Acharya Bangalore B-School (ABBS) is a leading autonomous institution in Bengaluru offering cutting-edge programs in business, management, commerce, aviation, life sciences, law, humanities and analytics. Known for strong industry partnerships and innovative teaching methods, ABBS prepares students for success in the global market.</p>
<p>The institute is <strong>approved by AICTE</strong>, accredited with a <strong>NAAC ''A'' Grade</strong>, and holds international accreditations from <strong>IACBE</strong> and <strong>SAQS</strong>, along with membership of the <strong>Association of Indian Universities (AIU)</strong>.</p>
<h3>5 Reasons to Choose ABBS</h3>
<ul>
 <li><strong>World-Class Faculty</strong> — Learn from experts who bring industry insights and real-world experience to the classroom.</li>
 <li><strong>Industry Partnerships</strong> — Collaborations with KPMG and the Bombay Stock Exchange power unique certification programs and internships.</li>
 <li><strong>Global Exposure</strong> — Exchange programs and international internships with partner universities abroad.</li>
 <li><strong>Campus Life</strong> — A dynamic campus with diverse clubs, student organisations and state-of-the-art facilities.</li>
 <li><strong>Placement Success</strong> — A dedicated placement cell ensures over 90% of graduates secure positions in leading companies.</li>
</ul>
<h3>Student Exchange with Foreign Universities</h3>
<p>ABBS students can participate in exchange programs with international partner universities including <strong>Daito Bunka University (Japan)</strong>, <strong>HELP University (Malaysia)</strong> and <strong>Rabat Business School (Morocco, AACSB-accredited)</strong>.</p>$c$,
  updated_at = now()
WHERE id = '22cad8d3-7732-48c5-a150-1141f8dd23bf';

-- Rankings section: accreditation badges from official site
UPDATE public.college_sections
SET
  data = jsonb_build_object(
    'accreditations', jsonb_build_array(
      jsonb_build_object('name', 'AICTE Approved'),
      jsonb_build_object('name', 'NAAC ''A'' Grade'),
      jsonb_build_object('name', 'IACBE Accredited'),
      jsonb_build_object('name', 'SAQS Accredited'),
      jsonb_build_object('name', 'AIU Member')
    )
  ),
  updated_at = now()
WHERE id = 'c253532b-eaac-496b-bc7c-d3ebdf104d4a';