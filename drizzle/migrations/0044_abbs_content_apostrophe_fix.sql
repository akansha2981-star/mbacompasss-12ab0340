-- Fix doubled apostrophes that rendered as quotes in ABBS section content
UPDATE public.college_sections
SET content = $c$<p>ABBS School of Management reports a strong placement record with <strong>160+ recruiting companies</strong> visiting the campus. The latest placement cycle recorded an <strong>average CTC of 7.6 LPA</strong> and a <strong>highest CTC of 22.5 LPA</strong>, with top recruiters including Amazon, KPMG, Deloitte, Infosys, Wipro and Accenture.</p>
<p><strong>Director's top placement highlights:</strong></p>
<ul>
 <li>30% of students secure jobs in tier-1 companies</li>
 <li>40% of students are placed in BFSI &amp; financial sector roles</li>
 <li>70% PPO conversions after internships</li>
 <li>77%+ of students are placed and onboarded from the 4th semester itself</li>
 <li>Domain-specific placements focused on each student's interest area, supported by HR forums like NHRWA and HRST</li>
</ul>
<p>ABBS also provides 100% placement assistance to international students, including internships and industry training support.</p>$c$,
  updated_at = now()
WHERE id = 'b66bb4eb-b13f-4b9b-b783-5022016fd6a8';

UPDATE public.college_sections
SET content = $c$<p>Established in <strong>2008</strong>, Acharya Bangalore B-School (ABBS) is a leading autonomous institution in Bengaluru offering cutting-edge programs in business, management, commerce, aviation, life sciences, law, humanities and analytics. Known for strong industry partnerships and innovative teaching methods, ABBS prepares students for success in the global market.</p>
<p>The institute is <strong>approved by AICTE</strong>, accredited with a <strong>NAAC 'A' Grade</strong>, and holds international accreditations from <strong>IACBE</strong> and <strong>SAQS</strong>, along with membership of the <strong>Association of Indian Universities (AIU)</strong>.</p>
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