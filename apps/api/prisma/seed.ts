import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.SEED_ORG_SLUG || 'default';
  const orgName = process.env.APP_NAME || 'My Company';

  let org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: orgName, slug },
    });
    console.log(`Created organization: ${org.name} (${org.slug})`);
  } else {
    console.log(`Organization already exists: ${org.name}`);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminKeycloakSub = process.env.SEED_ADMIN_KEYCLOAK_SUB || 'bootstrap-admin';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: adminKeycloakSub,
        keycloakSub: adminKeycloakSub,
        organizationId: org.id,
        firstName: 'Super',
        lastName: 'Admin',
        email: adminEmail,
        role: 'superadmin',
        isActive: true,
      },
    });
    console.log(`Created superadmin user: ${adminEmail}`);
  } else {
    console.log(`Superadmin user already exists: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
