import { vi, describe, it, expect, beforeEach } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError, type SessionPayload } from "@/lib/auth/assertions";

// ---------------------------------------------------------------------------
// Mock Prisma: must be declared before importing the service
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  db: {
    ticket: { findUnique: vi.fn() },
    attachment: { create: vi.fn(), findUnique: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { addAttachment, getAttachment } from "./service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return { userId: "user-1", teamId: "team-a", role: Role.SUPPORT, ...overrides };
}

// Prisma mock return values are partial stubs; cast to silence strict type checking.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stub = (value: unknown) => value as any;

const TEAM_A_TICKET = { teamId: "team-a", createdById: "user-1" };
const TEAM_B_TICKET = { teamId: "team-b", createdById: "user-9" };

const SMALL_FILE = new Uint8Array(500_000) as Uint8Array<ArrayBuffer>; // 500 KB, under limit
const BIG_FILE = new Uint8Array(1_100_000) as Uint8Array<ArrayBuffer>; // 1.1 MB, over limit

function attachmentInput(overrides: Record<string, unknown> = {}) {
  return {
    ticketId: "ticket-1",
    filename: "screenshot.jpg",
    mimeType: "image/jpeg",
    data: SMALL_FILE,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// addAttachment
// ---------------------------------------------------------------------------

describe("addAttachment — MIME type guard", () => {
  it("throws when mimeType is not in the allowlist", async () => {
    await expect(
      addAttachment(attachmentInput({ mimeType: "text/html" }), session())
    ).rejects.toThrow("Unsupported file type.");

    expect(db.ticket.findUnique).not.toHaveBeenCalled();
    expect(db.attachment.create).not.toHaveBeenCalled();
  });

  it("throws for application/octet-stream", async () => {
    await expect(
      addAttachment(attachmentInput({ mimeType: "application/octet-stream" }), session())
    ).rejects.toThrow("Unsupported file type.");
  });

  it("accepts image/jpeg, image/png, image/webp, application/pdf", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_A_TICKET));
    vi.mocked(db.attachment.create).mockResolvedValue(stub({ id: "att-0" }));

    for (const mimeType of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
      vi.clearAllMocks();
      vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_A_TICKET));
      vi.mocked(db.attachment.create).mockResolvedValue(stub({ id: "att-0" }));
      await expect(addAttachment(attachmentInput({ mimeType }), session())).resolves.not.toThrow();
    }
  });
});

describe("addAttachment — size guard", () => {
  it("throws when file exceeds 1 MB", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_A_TICKET));

    await expect(addAttachment(attachmentInput({ data: BIG_FILE }), session())).rejects.toThrow(
      "1 MB"
    );

    expect(db.attachment.create).not.toHaveBeenCalled();
  });

  it("accepts a file under 1 MB", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_A_TICKET));
    vi.mocked(db.attachment.create).mockResolvedValue(stub({ id: "att-1" }));

    await expect(addAttachment(attachmentInput(), session())).resolves.not.toThrow();
    expect(db.attachment.create).toHaveBeenCalledOnce();
  });
});

describe("addAttachment — ticket not found", () => {
  it("throws AuthorizationError when ticket does not exist", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(null));

    await expect(addAttachment(attachmentInput(), session())).rejects.toThrow(AuthorizationError);

    expect(db.attachment.create).not.toHaveBeenCalled();
  });
});

describe("addAttachment — cross-team isolation", () => {
  it("throws when session team does not match ticket team", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_B_TICKET));

    await expect(addAttachment(attachmentInput(), session({ teamId: "team-a" }))).rejects.toThrow(
      AuthorizationError
    );

    expect(db.attachment.create).not.toHaveBeenCalled();
  });

  it("allows SUPER to attach to any team's ticket", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_B_TICKET));
    vi.mocked(db.attachment.create).mockResolvedValue(stub({ id: "att-2" }));

    await expect(
      addAttachment(attachmentInput(), session({ role: Role.SUPER, teamId: null }))
    ).resolves.not.toThrow();
  });
});

describe("addAttachment — persists correct fields", () => {
  it("writes filename, mimeType, sizeBytes, and data to DB", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_A_TICKET));
    vi.mocked(db.attachment.create).mockResolvedValue(stub({ id: "att-3" }));

    await addAttachment(attachmentInput({ commentId: "comment-1" }), session());

    expect(db.attachment.create).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        commentId: "comment-1",
        filename: "screenshot.jpg",
        mimeType: "image/jpeg",
        sizeBytes: SMALL_FILE.length,
        data: SMALL_FILE,
      },
    });
  });

  it("omits commentId when not provided (ticket-level attachment)", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(stub(TEAM_A_TICKET));
    vi.mocked(db.attachment.create).mockResolvedValue(stub({ id: "att-4" }));

    await addAttachment(attachmentInput(), session());

    const call = vi.mocked(db.attachment.create).mock.calls[0][0];
    expect(call.data.commentId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAttachment
// ---------------------------------------------------------------------------

describe("getAttachment — not found", () => {
  it("throws AuthorizationError when attachment does not exist", async () => {
    vi.mocked(db.attachment.findUnique).mockResolvedValue(stub(null));

    await expect(getAttachment("att-missing", session())).rejects.toThrow(AuthorizationError);
  });
});

describe("getAttachment — cross-team isolation", () => {
  it("throws when session team does not match the attachment's ticket team", async () => {
    vi.mocked(db.attachment.findUnique).mockResolvedValue(
      stub({ id: "att-5", ticket: TEAM_B_TICKET })
    );

    await expect(getAttachment("att-5", session({ teamId: "team-a" }))).rejects.toThrow(
      AuthorizationError
    );
  });

  it("returns attachment when teams match", async () => {
    const attachment = { id: "att-6", ticket: TEAM_A_TICKET };
    vi.mocked(db.attachment.findUnique).mockResolvedValue(stub(attachment));

    await expect(getAttachment("att-6", session())).resolves.toEqual(attachment);
  });

  it("REQUESTER can fetch their own ticket's attachment", async () => {
    const attachment = { id: "att-7", ticket: { teamId: "team-a", createdById: "user-1" } };
    vi.mocked(db.attachment.findUnique).mockResolvedValue(stub(attachment));

    await expect(getAttachment("att-7", session({ role: Role.REQUESTER }))).resolves.toEqual(
      attachment
    );
  });

  it("REQUESTER cannot fetch another requester's ticket attachment", async () => {
    vi.mocked(db.attachment.findUnique).mockResolvedValue(
      stub({ id: "att-8", ticket: { teamId: "team-a", createdById: "user-other" } })
    );

    await expect(
      getAttachment("att-8", session({ role: Role.REQUESTER, userId: "user-1" }))
    ).rejects.toThrow(AuthorizationError);
  });
});
