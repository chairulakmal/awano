/**
 * Test scenarios: Tokutei Ginou (Specified Skilled Worker) support desk cases.
 *
 * Team A (demo)  — Indonesian and Vietnamese workers
 * Team B (beta)  — Myanmar and Vietnamese workers
 *
 * Covers all ticket statuses, every priority level, all requester types, and
 * a representative spread of FSM transitions (open → in-progress →
 * waiting/escalated/resolved → closed) with matching status events.
 */

import type { PrismaClient } from "../src/generated/prisma/client";
import type { TicketStatus, TicketPriority } from "../src/generated/prisma/enums";

type Db = PrismaClient;

export interface TicketSeedContext {
  teamAId: string;
  teamBId: string;
  hash: string; // bcrypt hash of demo password
  // Team A staff
  supportAId: string; // Dan Support
  managerAId: string; // Eve Manager
  // Team B staff
  supportBId: string; // Grace Support
  managerBId: string; // Hank Manager
  // Existing requesters from seed.ts
  customerAId: string; // Alice (Team A CUSTOMER)
  recruiterAId: string; // Bob   (Team A RECRUITER)
  agentAId: string; // Carol (Team A FIELD_AGENT)
  customerBId: string; // Frank (Team B CUSTOMER)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function cat(db: Db, teamId: string, slug: string, name: string) {
  return db.category.upsert({
    where: { teamId_slug: { teamId, slug } },
    update: {},
    create: { teamId, slug, name },
  });
}

async function worker(
  db: Db,
  teamId: string,
  email: string,
  hash: string,
  name: string,
  requesterType: "CUSTOMER" | "RECRUITER" | "FIELD_AGENT"
) {
  return db.user.upsert({
    where: { teamId_email: { teamId, email } },
    update: {},
    create: { teamId, email, passwordHash: hash, role: "REQUESTER", requesterType, name },
  });
}

async function ticket(
  db: Db,
  id: string,
  teamId: string,
  createdById: string,
  categoryId: string,
  subject: string,
  body: string,
  status: TicketStatus,
  priority: TicketPriority,
  assigneeId?: string
) {
  return db.ticket.upsert({
    where: { id },
    update: {},
    create: { id, teamId, createdById, categoryId, subject, body, status, priority, assigneeId },
  });
}

async function ev(
  db: Db,
  id: string,
  ticketId: string,
  actorId: string,
  toStatus: TicketStatus,
  fromStatus?: TicketStatus,
  note?: string
) {
  return db.statusEvent.upsert({
    where: { id },
    update: {},
    create: { id, ticketId, actorId, toStatus, fromStatus, note },
  });
}

async function comment(
  db: Db,
  id: string,
  ticketId: string,
  authorId: string,
  body: string,
  isInternal = false
) {
  return db.comment.upsert({
    where: { id },
    update: {},
    create: { id, ticketId, authorId, body, isInternal },
  });
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function seedTickets(db: Db, ctx: TicketSeedContext) {
  // ── Team A: categories ────────────────────────────────────────────────────
  const [visaA, housingA, employA, skillsA, healthA] = await Promise.all([
    cat(db, ctx.teamAId, "visa-docs", "Visa & Documentation"),
    cat(db, ctx.teamAId, "housing", "Housing"),
    cat(db, ctx.teamAId, "employment", "Employment & Contract"),
    cat(db, ctx.teamAId, "skills-cert", "Skills Certification"),
    cat(db, ctx.teamAId, "health-ins", "Health & Insurance"),
  ]);

  // ── Team B: categories ────────────────────────────────────────────────────
  const [visaB, housingB, employB, skillsB, healthB, dailyB] = await Promise.all([
    cat(db, ctx.teamBId, "visa-docs", "Visa & Documentation"),
    cat(db, ctx.teamBId, "housing", "Housing"),
    cat(db, ctx.teamBId, "employment", "Employment & Contract"),
    cat(db, ctx.teamBId, "skills-cert", "Skills Certification"),
    cat(db, ctx.teamBId, "health-ins", "Health & Insurance"),
    cat(db, ctx.teamBId, "daily-life", "Daily Life Support"),
  ]);

  // ── Team A: worker users ──────────────────────────────────────────────────
  // Indonesian and Vietnamese workers; support staff already in seed.ts
  const rahmat = await worker(
    db,
    ctx.teamAId,
    "rahmat@awano.demo",
    ctx.hash,
    "Rahmat Hidayat",
    "CUSTOMER" // Indonesian, food manufacturing sector
  );
  const minh = await worker(
    db,
    ctx.teamAId,
    "nguyen@awano.demo",
    ctx.hash,
    "Nguyen Van Minh",
    "CUSTOMER" // Vietnamese, food service sector
  );

  // ── Team B: worker users ──────────────────────────────────────────────────
  // Myanmar and Vietnamese workers; Ma Htwe is the on-site coordinator
  const kyaw = await worker(
    db,
    ctx.teamBId,
    "kyaw@beta.demo",
    ctx.hash,
    "Kyaw Thu",
    "CUSTOMER" // Myanmar, metal fabrication sector
  );
  const lan = await worker(
    db,
    ctx.teamBId,
    "lan@beta.demo",
    ctx.hash,
    "Nguyen Thi Lan",
    "CUSTOMER" // Vietnamese, care work sector
  );
  const mahtwe = await worker(
    db,
    ctx.teamBId,
    "mahtwe@beta.demo",
    ctx.hash,
    "Ma Htwe",
    "FIELD_AGENT" // Myanmar on-site coordinator at Kawaguchi facility
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TEAM A — demo team tickets
  // Workers: Rahmat Hidayat (Indonesian), Nguyen Van Minh (Vietnamese)
  // Existing requesters: Alice (customer), Bob (recruiter), Carol (field agent)
  // ══════════════════════════════════════════════════════════════════════════

  // OPEN · URGENT — Indonesian worker, residence card expiring
  await ticket(
    db,
    "seed-ticket-a1",
    ctx.teamAId,
    rahmat.id,
    visaA.id,
    "在留カード renewal — expires in 12 days",
    "My residence card (在留カード) expires on the 28th of this month. I submitted the renewal application to Mito Immigration Bureau 6 weeks ago but have received no notification or receipt slip. My Tokutei Ginou No. 1 status and work permit are both linked to this card — my employer at Yamamoto Foods is also very concerned about work continuity. Please help follow up with the bureau urgently.",
    "OPEN",
    "URGENT"
  );

  // IN_PROGRESS · HIGH — Vietnamese worker, skills exam registration
  await ticket(
    db,
    "seed-ticket-a2",
    ctx.teamAId,
    minh.id,
    skillsA.id,
    "Tokutei Ginou No. 1 skills exam registration — food service (外食業)",
    "I have completed 18 months of food service preparation work and my supervisor has confirmed my eligibility evaluation. I would like to register for the next Tokutei Ginou No. 1 skills exam for the food service sector (外食業). Please confirm the next available test date and help me complete the online registration via the SSW-JLPT portal. My current status visa expires in 4 months so timing is important.",
    "IN_PROGRESS",
    "HIGH",
    ctx.supportAId
  );

  // WAITING_ON_REQUESTER · NORMAL — Indonesian worker, double dormitory deduction
  await ticket(
    db,
    "seed-ticket-a3",
    ctx.teamAId,
    ctx.customerAId,
    housingA.id,
    "January payslip: dormitory fee deducted twice (¥25,000 × 2)",
    "My January salary shows the dormitory rent deducted twice — ¥25,000 on the 10th and again on the 25th. Previous months had only one deduction on the 10th. I have not been informed of any change to the billing schedule. Please let me know if this is an error or a new arrangement — I can send a photo of the payslip if that helps.",
    "WAITING_ON_REQUESTER",
    "NORMAL",
    ctx.supportAId
  );

  // ESCALATED · HIGH — Field agent, contract amendment dispute
  await ticket(
    db,
    "seed-ticket-a4",
    ctx.teamAId,
    ctx.agentAId,
    employA.id,
    "Contract amendment dispute — 3 Indonesian workers at Yamamoto Foods, Ibaraki",
    "Three Tokutei Ginou No. 1 workers under my coordination at Yamamoto Foods (Ibaraki site) have been asked to sign an amendment reducing overtime pay from 1.35× to 1.25× effective next month. All three have declined. The site manager verbally threatened non-renewal of their placement contracts. Workers: Budi Santoso (EMP-1042), Agus Pramono (EMP-1043), Siti Wuryanti (EMP-1051), all Indonesian nationals. This may violate Article 89 of the Labour Standards Act — please escalate to management.",
    "ESCALATED",
    "HIGH",
    ctx.supportAId
  );

  // RESOLVED · NORMAL — Vietnamese worker, birth certificate translation
  await ticket(
    db,
    "seed-ticket-a5",
    ctx.teamAId,
    minh.id,
    visaA.id,
    "Certified Japanese translation of Vietnamese birth certificate",
    "My immigration adviser requires a certified Japanese translation of my Vietnamese birth certificate as part of the Tokutei Ginou visa renewal package. Could you recommend a translation agency approved by the regional immigration bureau, or arrange the translation through your office? I can send the original document as a scanned PDF.",
    "RESOLVED",
    "NORMAL",
    ctx.supportAId
  );

  // OPEN · NORMAL — Recruiter, new-batch onboarding request
  await ticket(
    db,
    "seed-ticket-a6",
    ctx.teamAId,
    ctx.recruiterAId,
    employA.id,
    "Onboarding request: 6 new Indonesian workers arriving 10 March",
    "We have a new cohort of 6 Tokutei Ginou No. 1 workers from Indonesia arriving at Narita on 10 March. All hold valid COEs and residence cards. Please initiate the standard onboarding checklist: city hall residential registration (住民登録), Japan Post bank account opening, National Health Insurance enrollment, and dormitory key collection at the Tsukuba facility. Worker names and passport numbers are in the attached list.",
    "OPEN",
    "NORMAL"
  );

  // IN_PROGRESS · HIGH — Indonesian worker, NHI card never received
  await ticket(
    db,
    "seed-ticket-a7",
    ctx.teamAId,
    rahmat.id,
    healthA.id,
    "National Health Insurance card not received — enrolled 3 months ago",
    "I enrolled in National Health Insurance (国民健康保険) at city hall 3 months ago and received a confirmation slip, but the insurance card has never arrived. Last week I had to pay ¥8,400 out of pocket at a clinic because I could not show coverage. Please help me verify my enrollment status and obtain a replacement card as soon as possible.",
    "IN_PROGRESS",
    "HIGH",
    ctx.supportAId
  );

  // CLOSED · LOW — Field agent, NHI claims explanation in Bahasa Indonesia
  await ticket(
    db,
    "seed-ticket-a8",
    ctx.teamAId,
    ctx.agentAId,
    healthA.id,
    "Worker needs NHI reimbursement process explained in Bahasa Indonesia",
    "One of my workers, Susilo Bambang (Indonesian, Mito factory), was treated at a clinic and received a bill. He is confused about how to claim reimbursement under his NHI plan and does not read Japanese. Could you prepare a short step-by-step guide in Bahasa Indonesia, or arrange a brief phone call with him? He is available on weekday evenings after 19:00.",
    "CLOSED",
    "LOW",
    ctx.supportAId
  );

  // OPEN · NORMAL — Vietnamese worker, employment letter for bank account
  await ticket(
    db,
    "seed-ticket-a9",
    ctx.teamAId,
    minh.id,
    employA.id,
    "Employment verification letter needed for Japan Post bank account",
    "I am trying to open a Japan Post (ゆうちょ銀行) savings account for salary deposit. The bank clerk asked for an employment verification letter (在職証明書) in Japanese. My company HR says they can issue it but need a formal request from this support desk. Could you help me obtain this document? I need it within two weeks for the next payroll setup.",
    "OPEN",
    "NORMAL"
  );

  // RESOLVED · LOW — Indonesian worker, Japanese language class enrolment
  await ticket(
    db,
    "seed-ticket-a10",
    ctx.teamAId,
    ctx.customerAId,
    skillsA.id,
    "Requesting enrolment in sponsored Japanese language class (N4 level)",
    "My employer mentioned there are company-sponsored Japanese language classes available for Tokutei Ginou workers. I currently have basic conversational Japanese (approximately N5 level) and would like to enrol in the N4 class if a spot is available. Could you check availability and process the enrolment through the company scheme?",
    "RESOLVED",
    "LOW",
    ctx.supportAId
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TEAM B — beta team tickets
  // Workers: Kyaw Thu (Myanmar), Nguyen Thi Lan (Vietnamese), Ma Htwe (field agent)
  // Existing requester: Frank (company liaison role)
  // ══════════════════════════════════════════════════════════════════════════

  // OPEN · URGENT — Myanmar worker, COE not returned before permitted period ends
  await ticket(
    db,
    "seed-ticket-b1",
    ctx.teamBId,
    kyaw.id,
    visaB.id,
    "Certificate of Eligibility not returned — permitted period ends in 3 weeks",
    "My Certificate of Eligibility (在留資格認定証明書) was submitted to the regional immigration bureau 6 weeks ago for renewal. My current permitted period ends in 3 weeks and I have received no response or updated document. Without the renewed COE I cannot apply for a visa stamp. My employer Tanaka Seimitsu is also urgently asking for an update on my work status.",
    "OPEN",
    "URGENT"
  );

  // IN_PROGRESS · HIGH — Vietnamese worker, apostille on care work skills certificate
  await ticket(
    db,
    "seed-ticket-b2",
    ctx.teamBId,
    lan.id,
    skillsB.id,
    "Vietnamese skills certificate apostille — incorrect format rejected by consulate",
    "I hold a Vietnamese national skills certificate in care work (介護) required for my Tokutei Ginou No. 2 application. The certificate needs an apostille from the Vietnamese Ministry of Foreign Affairs and a certified Japanese translation. The Vietnamese consulate in Osaka returned my documents last month saying the format was incorrect. Please advise on the correct procedure or connect me with an immigration specialist.",
    "IN_PROGRESS",
    "HIGH",
    ctx.supportBId
  );

  // ESCALATED · URGENT — Field agent, workplace injury and coerced negligence waiver
  await ticket(
    db,
    "seed-ticket-b3",
    ctx.teamBId,
    mahtwe.id,
    employB.id,
    "Workplace injury — Zaw Myo (Myanmar) signed negligence waiver under pressure",
    "On 14 February, Zaw Myo (Myanmar national, DOB 1995-08-22) sustained a crush injury to his left hand at Sasaki Machinery and has been hospitalised for 3 days. The employer presented a form stating the injury was due to personal negligence. Zaw Myo does not read Japanese and signed under pressure without understanding the document. We need legal support immediately to file a 労災 (rousai) workers' compensation claim and contest the signed waiver.",
    "ESCALATED",
    "URGENT",
    ctx.supportBId
  );

  // WAITING_ON_REQUESTER · NORMAL — Company liaison, rental contract review
  await ticket(
    db,
    "seed-ticket-b4",
    ctx.teamBId,
    ctx.customerBId,
    housingB.id,
    "12-page dormitory renewal contract in Japanese — need summary before signing",
    "Our dormitory manager has issued the annual contract renewal in Japanese only (12 pages). Our workers are Vietnamese and Myanmar nationals with limited Japanese reading ability. I have uploaded the contract PDF. Could you provide a plain-language summary in English of the key obligations, especially around maintenance responsibilities and early termination penalties? We need to sign by the end of the month.",
    "WAITING_ON_REQUESTER",
    "NORMAL",
    ctx.supportBId
  );

  // RESOLVED · LOW — Myanmar worker, driving licence conversion query
  await ticket(
    db,
    "seed-ticket-b5",
    ctx.teamBId,
    kyaw.id,
    dailyB.id,
    "Converting Myanmar driving licence to Japanese licence — documents needed",
    "I hold a valid Myanmar driving licence (class B, regular car). I understand foreign licences can be converted at the driving licence centre (運転免許センター) without a full driving test for some countries. Could you confirm whether Myanmar is on the simplified conversion list, and if so, what documents I need to bring? My employer has said a Japanese licence would allow me to drive the company vehicle for deliveries.",
    "RESOLVED",
    "LOW"
  );

  // OPEN · HIGH — Vietnamese worker, unlawful salary deduction for uniform rental
  await ticket(
    db,
    "seed-ticket-b6",
    ctx.teamBId,
    lan.id,
    employB.id,
    "Uniform rental deduction increased to ¥18,500/month without new written consent",
    "My employer deducts ¥18,500 per month for mandatory uniform rental. The written consent form I signed stated ¥12,000/month. No new agreement was presented when the deduction changed. I believe the Labour Standards Act requires a written agreement for each deduction amount from salary. Could you advise whether this is a violation and how I should raise it with my employer?",
    "OPEN",
    "HIGH"
  );

  // IN_PROGRESS · NORMAL — Field agent, city hall registration blocked
  await ticket(
    db,
    "seed-ticket-b7",
    ctx.teamBId,
    mahtwe.id,
    visaB.id,
    "City hall 住民登録 blocked for 3 Myanmar workers — employer address letter refused",
    "I accompanied three newly-arrived Myanmar workers to Kawaguchi City Hall for residential registration (住民登録) twice this week. Both times the clerk said a document was missing: a residence verification letter from the employer. The workers' company HR says they do not issue such a document. Could you clarify what substitute document (e.g. dormitory lease agreement) is acceptable, and whether we can request the clerk to accept it?",
    "IN_PROGRESS",
    "NORMAL",
    ctx.supportBId
  );

  // CLOSED · NORMAL — Company liaison, pre-entry health check translation
  await ticket(
    db,
    "seed-ticket-b8",
    ctx.teamBId,
    ctx.customerBId,
    healthB.id,
    "Pre-entry health check (入国前健康診断) results need certified Japanese translation",
    "A group of 4 Vietnamese workers arriving next month must submit pre-entry health check results in Japanese for the immigration application. The clinic in Vietnam issued the results in Vietnamese only. Could you recommend a certified translation service accepted by the regional immigration bureau, and confirm the exact format (stamp, signature) required on the translated document?",
    "CLOSED",
    "NORMAL",
    ctx.supportBId
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STATUS EVENTS — key transitions for non-OPEN tickets
  // ══════════════════════════════════════════════════════════════════════════

  await Promise.all([
    // tA2: OPEN → IN_PROGRESS
    ev(
      db,
      "seed-ev-a2-1",
      "seed-ticket-a2",
      ctx.supportAId,
      "IN_PROGRESS",
      "OPEN",
      "Checking SSW-JLPT portal for next exam schedule"
    ),

    // tA3: OPEN → IN_PROGRESS → WAITING_ON_REQUESTER
    ev(db, "seed-ev-a3-1", "seed-ticket-a3", ctx.supportAId, "IN_PROGRESS", "OPEN"),
    ev(
      db,
      "seed-ev-a3-2",
      "seed-ticket-a3",
      ctx.supportAId,
      "WAITING_ON_REQUESTER",
      "IN_PROGRESS",
      "Asked requester to share a photo of the January payslip for verification"
    ),

    // tA4: OPEN → IN_PROGRESS → ESCALATED
    ev(
      db,
      "seed-ev-a4-1",
      "seed-ticket-a4",
      ctx.supportAId,
      "IN_PROGRESS",
      "OPEN",
      "Reviewing contract amendment terms against Labour Standards Act"
    ),
    ev(
      db,
      "seed-ev-a4-2",
      "seed-ticket-a4",
      ctx.managerAId,
      "ESCALATED",
      "IN_PROGRESS",
      "Potential LSA Article 89 violation — escalating for legal review"
    ),

    // tA5: OPEN → IN_PROGRESS → RESOLVED
    ev(db, "seed-ev-a5-1", "seed-ticket-a5", ctx.supportAId, "IN_PROGRESS", "OPEN"),
    ev(
      db,
      "seed-ev-a5-2",
      "seed-ticket-a5",
      ctx.supportAId,
      "RESOLVED",
      "IN_PROGRESS",
      "Translation arranged via certified agency; delivered to requester"
    ),

    // tA7: OPEN → IN_PROGRESS
    ev(
      db,
      "seed-ev-a7-1",
      "seed-ticket-a7",
      ctx.supportAId,
      "IN_PROGRESS",
      "OPEN",
      "Contacting city hall to verify NHI enrollment record"
    ),

    // tA8: OPEN → IN_PROGRESS → RESOLVED → CLOSED
    ev(db, "seed-ev-a8-1", "seed-ticket-a8", ctx.supportAId, "IN_PROGRESS", "OPEN"),
    ev(
      db,
      "seed-ev-a8-2",
      "seed-ticket-a8",
      ctx.supportAId,
      "RESOLVED",
      "IN_PROGRESS",
      "Bahasa Indonesia NHI guide sent to worker via field agent"
    ),
    ev(
      db,
      "seed-ev-a8-3",
      "seed-ticket-a8",
      ctx.managerAId,
      "CLOSED",
      "RESOLVED",
      "Worker confirmed the guide was sufficient; no further action needed"
    ),

    // tA10: OPEN → IN_PROGRESS → RESOLVED
    ev(db, "seed-ev-a10-1", "seed-ticket-a10", ctx.supportAId, "IN_PROGRESS", "OPEN"),
    ev(
      db,
      "seed-ev-a10-2",
      "seed-ticket-a10",
      ctx.supportAId,
      "RESOLVED",
      "IN_PROGRESS",
      "Enrolled in N4 class starting next month; confirmation sent"
    ),

    // tB2: OPEN → IN_PROGRESS
    ev(
      db,
      "seed-ev-b2-1",
      "seed-ticket-b2",
      ctx.supportBId,
      "IN_PROGRESS",
      "OPEN",
      "Reviewing apostille requirements with immigration specialist"
    ),

    // tB3: OPEN → IN_PROGRESS → ESCALATED
    ev(
      db,
      "seed-ev-b3-1",
      "seed-ticket-b3",
      ctx.supportBId,
      "IN_PROGRESS",
      "OPEN",
      "Gathering details of the incident and the signed document"
    ),
    ev(
      db,
      "seed-ev-b3-2",
      "seed-ticket-b3",
      ctx.managerBId,
      "ESCALATED",
      "IN_PROGRESS",
      "Coerced waiver signed without understanding — escalating for legal intervention"
    ),

    // tB4: OPEN → IN_PROGRESS → WAITING_ON_REQUESTER
    ev(db, "seed-ev-b4-1", "seed-ticket-b4", ctx.supportBId, "IN_PROGRESS", "OPEN"),
    ev(
      db,
      "seed-ev-b4-2",
      "seed-ticket-b4",
      ctx.supportBId,
      "WAITING_ON_REQUESTER",
      "IN_PROGRESS",
      "Contract PDF not yet received; asked requester to upload"
    ),

    // tB5: OPEN → IN_PROGRESS → RESOLVED
    ev(db, "seed-ev-b5-1", "seed-ticket-b5", ctx.supportBId, "IN_PROGRESS", "OPEN"),
    ev(
      db,
      "seed-ev-b5-2",
      "seed-ticket-b5",
      ctx.supportBId,
      "RESOLVED",
      "IN_PROGRESS",
      "Confirmed Myanmar is on simplified conversion list; document checklist sent"
    ),

    // tB7: OPEN → IN_PROGRESS
    ev(
      db,
      "seed-ev-b7-1",
      "seed-ticket-b7",
      ctx.supportBId,
      "IN_PROGRESS",
      "OPEN",
      "Checking Kawaguchi City Hall policy on substitute address documents"
    ),

    // tB8: OPEN → IN_PROGRESS → RESOLVED → CLOSED
    ev(db, "seed-ev-b8-1", "seed-ticket-b8", ctx.supportBId, "IN_PROGRESS", "OPEN"),
    ev(
      db,
      "seed-ev-b8-2",
      "seed-ticket-b8",
      ctx.supportBId,
      "RESOLVED",
      "IN_PROGRESS",
      "Certified translation service recommended; format confirmed with bureau"
    ),
    ev(db, "seed-ev-b8-3", "seed-ticket-b8", ctx.managerBId, "CLOSED", "RESOLVED"),
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // COMMENTS — support replies and internal notes
  // ══════════════════════════════════════════════════════════════════════════

  await Promise.all([
    // tA2: support reply about next exam date
    comment(
      db,
      "seed-comment-a2-1",
      "seed-ticket-a2",
      ctx.supportAId,
      "I've checked the SSW-JLPT portal. The next food service sector exam is scheduled for 15 April at Tokyo and Osaka venues. I'll start the online registration on your behalf — please confirm your preferred venue by replying to this ticket."
    ),

    // tA3: support asks for payslip; internal note about known payroll issue
    comment(
      db,
      "seed-comment-a3-1",
      "seed-ticket-a3",
      ctx.supportAId,
      "Thank you for reporting this. Could you please take a photo of your January payslip (both the deduction summary page and the full salary breakdown) and share it here? That will allow us to verify the charges directly with payroll."
    ),
    comment(
      db,
      "seed-comment-a3-2",
      "seed-ticket-a3",
      ctx.supportAId,
      "Internal: two other workers at the same facility reported identical duplicate deductions this month. Likely a batch billing error from the January payroll system migration — flagging to payroll team separately.",
      true
    ),

    // tA4: internal note from manager on legal path
    comment(
      db,
      "seed-comment-a4-1",
      "seed-ticket-a4",
      ctx.managerAId,
      "Internal: contacted our labour attorney. Amending agreed wage conditions requires individual written consent and 30-day advance notice under the Work Rules notification requirement. The non-renewal threat likely constitutes unfair labour practice. Drafting a formal objection letter to Yamamoto Foods HR.",
      true
    ),

    // tA5: resolution message to requester
    comment(
      db,
      "seed-comment-a5-1",
      "seed-ticket-a5",
      ctx.supportAId,
      "The certified translation has been completed by Honyaku Center (Tokyo office) and sent to your immigration adviser by email. Please confirm with your adviser that they have received the document. This ticket will close in 5 business days if no further issues are raised."
    ),

    // tA7: update on NHI card reissue
    comment(
      db,
      "seed-comment-a7-1",
      "seed-ticket-a7",
      ctx.supportAId,
      "I've confirmed your enrollment with Mito City Health Insurance Division — your record is active, but the card was sent to a previous dormitory address. A reissue request has been submitted and you should receive the new card within 7–10 business days. Keep your confirmation slip as proof of coverage until then."
    ),

    // tB3: manager comment after escalation
    comment(
      db,
      "seed-comment-b3-1",
      "seed-ticket-b3",
      ctx.managerBId,
      "We have engaged a labour attorney specialising in 労災 claims. An urgent consultation is scheduled for tomorrow morning. Do not allow Zaw Myo to sign any further documents from the employer until after the consultation. The attorney will also assess whether the original waiver is enforceable given it was signed without comprehension."
    ),
    comment(
      db,
      "seed-comment-b3-2",
      "seed-ticket-b3",
      ctx.supportBId,
      "Internal: this is the second 労災 underreporting incident at Sasaki Machinery in 18 months. Flagging to compliance team for pattern review.",
      true
    ),

    // tB6: initial response on salary deduction
    comment(
      db,
      "seed-comment-b6-1",
      "seed-ticket-b6",
      ctx.supportBId,
      "Under Article 24 of the Labour Standards Act, deductions from wages require a written agreement specifying the exact amount — a unilateral change in amount without a new agreement is not compliant. Please gather any payslips showing the change and the original signed consent form if you have a copy. We will send a formal inquiry to your employer's HR department on your behalf."
    ),
  ]);
}
