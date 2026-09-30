import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SEED_IDS, SEED_PASSWORD } from '@travel-bug/db';
import { AppModule } from './../src/app.module';

config({ path: resolve(__dirname, '../../../.env') });

describe('Phase 5 auth + ACL (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: SEED_PASSWORD })
      .expect(201);
    return res.body.accessToken as string;
  }

  it('login then GET /trips with Bearer', async () => {
    const token = await login('solo@travelbug.demo');
    const res = await request(app.getHttpServer())
      .get('/trips')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((t: { id: string }) => t.id === SEED_IDS.trip)).toBe(true);
  });

  it('traveler cannot read another users vault docs as own list only', async () => {
    const token = await login('solo@travelbug.demo');
    const res = await request(app.getHttpServer())
      .get('/vault/documents')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const doc of res.body) {
      expect(doc.userId).toBe(SEED_IDS.travelerIndependent);
    }
  });

  it('GET /trips/:id/gems returns place-scoped Paris gems', async () => {
    const token = await login('solo@travelbug.demo');
    const res = await request(app.getHttpServer())
      .get(`/trips/${SEED_IDS.trip}/gems`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Independent trip: public gems only under Paris tree
    expect(
      res.body.every((g: { operatorId: string | null }) => g.operatorId === null),
    ).toBe(true);
    expect(res.body.some((g: { id: string }) => g.id === SEED_IDS.gem1)).toBe(true);
  });

  it('from-gem adds itinerary item for catalog gem', async () => {
    const token = await login('solo@travelbug.demo');
    // gem1 is public Saint-Germain; day2 is Saint-Germain focused
    const res = await request(app.getHttpServer())
      .post(`/itinerary/days/${SEED_IDS.day2}/items/from-gem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gemId: SEED_IDS.gem1, timeSlot: '17:00', sortOrder: 99 })
      .expect(201);
    expect(res.body.gemId).toBe(SEED_IDS.gem1);
    expect(res.body.title).toContain('Panoramas');
  });

  it('rejects unauthenticated trips', async () => {
    await request(app.getHttpServer()).get('/trips').expect(401);
  });

  it('agency can upload a document into a traveler vault on their trip', async () => {
    const token = await login('manager@wanderlust.pro');
    const title = `E2E boarding ${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/vault/documents')
      .set('Authorization', `Bearer ${token}`)
      .field('tripId', SEED_IDS.tripAgencyParis)
      .field('userId', SEED_IDS.travelerAgency)
      .field('docType', 'flight')
      .field('title', title)
      .attach('file', Buffer.from('%PDF-1.4 mock'), 'boarding.pdf')
      .expect(201);
    expect(res.body.userId).toBe(SEED_IDS.travelerAgency);
    expect(res.body.tripId).toBe(SEED_IDS.tripAgencyParis);

    const list = await request(app.getHttpServer())
      .get(`/vault/documents?tripId=${SEED_IDS.tripAgencyParis}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.some((d: { title: string }) => d.title === title)).toBe(true);

    const travelerToken = await login('client@wanderlust.pro');
    const travelerVault = await request(app.getHttpServer())
      .get('/vault/documents')
      .set('Authorization', `Bearer ${travelerToken}`)
      .expect(200);
    expect(
      travelerVault.body.some(
        (d: { title: string; userId: string }) =>
          d.title === title && d.userId === SEED_IDS.travelerAgency,
      ),
    ).toBe(true);

    const filtered = await request(app.getHttpServer())
      .get(
        `/vault/documents?tripId=${SEED_IDS.tripAgencyParis}&userId=${SEED_IDS.travelerAgency}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      filtered.body.every(
        (d: { userId: string }) => d.userId === SEED_IDS.travelerAgency,
      ),
    ).toBe(true);

    // Tear down so repeated e2e runs do not accumulate vault rows on seed trips
    await request(app.getHttpServer())
      .delete(`/vault/documents/${res.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('GET /agencies/trips/:id/clients is paginated and getTripClient works', async () => {
    const token = await login('manager@wanderlust.pro');
    const list = await request(app.getHttpServer())
      .get(`/agencies/trips/${SEED_IDS.tripAgencyParis}/clients?page=1&pageSize=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(list.body.items)).toBe(true);
    expect(typeof list.body.total).toBe('number');
    expect(
      list.body.items.some((u: { id: string }) => u.id === SEED_IDS.travelerAgency),
    ).toBe(true);

    const one = await request(app.getHttpServer())
      .get(
        `/agencies/trips/${SEED_IDS.tripAgencyParis}/clients/${SEED_IDS.travelerAgency}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(one.body.id).toBe(SEED_IDS.travelerAgency);
    expect(one.body.email).toBe('client@wanderlust.pro');
  });

  it('traveler cannot edit agency trip but can copy with vault docs duplicated', async () => {
    const manager = await login('manager@wanderlust.pro');
    const token = await login('client@wanderlust.pro');
    await request(app.getHttpServer())
      .post(`/itinerary/days/${SEED_IDS.dayAgencyParis1}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemType: 'activity',
        title: 'Should fail',
        timeSlot: '09:00',
      })
      .expect(403);

    // Ensure at least one source vault doc, then clean it up after the copy assertion
    const title = `E2E copy-source ${Date.now()}`;
    const uploaded = await request(app.getHttpServer())
      .post('/vault/documents')
      .set('Authorization', `Bearer ${manager}`)
      .field('tripId', SEED_IDS.tripAgencyParis)
      .field('userId', SEED_IDS.travelerAgency)
      .field('docType', 'flight')
      .field('title', title)
      .attach('file', Buffer.from('%PDF-1.4 copy-src'), 'copy-src.pdf')
      .expect(201);

    const copy = await request(app.getHttpServer())
      .post(`/trips/${SEED_IDS.tripAgencyParis}/copy`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(copy.body.operatorId).toBeNull();
    expect(copy.body.userId).toBe(SEED_IDS.travelerAgency);
    expect(copy.body.sourceTripId).toBe(SEED_IDS.tripAgencyParis);
    expect(copy.body.documentsCopied).toBeGreaterThanOrEqual(1);

    const sourceDocs = await request(app.getHttpServer())
      .get(`/vault/documents?tripId=${SEED_IDS.tripAgencyParis}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const copyDocs = await request(app.getHttpServer())
      .get(`/vault/documents?tripId=${copy.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(sourceDocs.body.length).toBeGreaterThanOrEqual(1);
    expect(copyDocs.body.length).toBe(copy.body.documentsCopied);
    // Same file stays available on both trips (copied rows, not moved)
    const sourceUrls = new Set(
      sourceDocs.body.map((d: { fileUrl: string }) => d.fileUrl),
    );
    expect(
      copyDocs.body.every((d: { fileUrl: string }) => sourceUrls.has(d.fileUrl)),
    ).toBe(true);

    // Personal copy + its vault rows; remove temp source upload from agency trip
    await request(app.getHttpServer())
      .delete(`/trips/${copy.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/vault/documents/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${manager}`)
      .expect(200);
  });

  it('traveler can patch and delete personal trips but not agency trips', async () => {
    const agencyClient = await login('client@wanderlust.pro');
    await request(app.getHttpServer())
      .patch(`/trips/${SEED_IDS.tripAgencyParis}`)
      .set('Authorization', `Bearer ${agencyClient}`)
      .send({ title: 'Nope' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/trips/${SEED_IDS.tripAgencyParis}`)
      .set('Authorization', `Bearer ${agencyClient}`)
      .expect(403);

    const token = await login('solo@travelbug.demo');
    const start = new Date();
    start.setDate(start.getDate() + 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const created = await request(app.getHttpServer())
      .post('/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Temp delete me',
        destination: 'Paris',
        destinationPlaceId: SEED_IDS.placeParis,
        startDate,
        endDate,
      })
      .expect(201);

    expect(created.body.operatorId).toBeNull();
    expect(created.body.title).toBe('Temp delete me');

    const patched = await request(app.getHttpServer())
      .patch(`/trips/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Temp renamed' })
      .expect(200);
    expect(patched.body.title).toBe('Temp renamed');

    // Attach a vault doc, then delete trip — vault rows for that trip must go away
    await request(app.getHttpServer())
      .post('/vault/documents')
      .set('Authorization', `Bearer ${token}`)
      .field('tripId', created.body.id)
      .field('docType', 'flight')
      .field('title', 'Temp boarding pass')
      .attach('file', Buffer.from('%PDF-1.4 temp'), 'temp-pass.pdf')
      .expect(201);

    const beforeDelete = await request(app.getHttpServer())
      .get(`/vault/documents?tripId=${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(beforeDelete.body.length).toBeGreaterThanOrEqual(1);

    const deleted = await request(app.getHttpServer())
      .delete(`/trips/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(deleted.body.ok).toBe(true);
    expect(deleted.body.documentsDeleted).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .get(`/trips/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    const vault = await request(app.getHttpServer())
      .get('/vault/documents')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      vault.body.every((d: { tripId: string }) => d.tripId !== created.body.id),
    ).toBe(true);
  });

  it('agency can post trip message; traveler sees it and gets notification', async () => {
    const manager = await login('manager@wanderlust.pro');
    const title = `E2E board ${Date.now()}`;
    const created = await request(app.getHttpServer())
      .post(`/trips/${SEED_IDS.tripTokyo}/messages`)
      .set('Authorization', `Bearer ${manager}`)
      .send({
        kind: 'notice',
        title,
        body: 'Please confirm your arrival window.',
      })
      .expect(201);
    expect(created.body.title).toBe(title);
    expect(created.body.kind).toBe('notice');

    const traveler = await login('client@wanderlust.pro');
    const messages = await request(app.getHttpServer())
      .get(`/trips/${SEED_IDS.tripTokyo}/messages`)
      .set('Authorization', `Bearer ${traveler}`)
      .expect(200);
    expect(messages.body.some((m: { title: string }) => m.title === title)).toBe(true);

    const notifs = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${traveler}`)
      .expect(200);
    const match = notifs.body.find(
      (n: { title: string; messageId?: string }) => n.title === title,
    );
    expect(match).toBeTruthy();
    expect(match.type).toBe('trip_message');
    expect(match.messageId).toBe(created.body.id);

    await request(app.getHttpServer())
      .post(`/notifications/${match.id}/read`)
      .set('Authorization', `Bearer ${traveler}`)
      .expect(201);
  });

  it('traveler cannot post to message board', async () => {
    const traveler = await login('client@wanderlust.pro');
    await request(app.getHttpServer())
      .post(`/trips/${SEED_IDS.tripTokyo}/messages`)
      .set('Authorization', `Bearer ${traveler}`)
      .send({ kind: 'info', title: 'Nope', body: 'Should fail' })
      .expect(403);
  });

  it('agency vault upload creates vault_document notification; mark-all-read works', async () => {
    const manager = await login('manager@wanderlust.pro');
    const title = `E2E notif vault ${Date.now()}`;
    const uploaded = await request(app.getHttpServer())
      .post('/vault/documents')
      .set('Authorization', `Bearer ${manager}`)
      .field('tripId', SEED_IDS.tripAgencyParis)
      .field('userId', SEED_IDS.travelerAgency)
      .field('docType', 'ticket')
      .field('title', title)
      .attach('file', Buffer.from('%PDF-1.4 mock'), 'ticket.pdf')
      .expect(201);

    const traveler = await login('client@wanderlust.pro');
    const before = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${traveler}`)
      .expect(200);
    expect(before.body.count).toBeGreaterThanOrEqual(1);

    const notifs = await request(app.getHttpServer())
      .get('/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${traveler}`)
      .expect(200);
    expect(
      notifs.body.some(
        (n: { type: string; documentId?: string }) =>
          n.type === 'vault_document' && n.documentId === uploaded.body.id,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${traveler}`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${traveler}`)
      .expect(200);
    expect(after.body.count).toBe(0);

    await request(app.getHttpServer())
      .delete(`/vault/documents/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${manager}`)
      .expect(200);
  });
});
