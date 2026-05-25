import prisma from '../src/prisma/client';

const categories = [
  {
    name: 'Vehicle Make & Model', slug: 'vehicle_make', color: '#3b82f6', order: 0,
    values: ['Ford Ranger', 'Volkswagen Amarok', 'BYD', 'Toyota HiLux', 'Isuzu D-Max', 'Mitsubishi Triton', 'Nissan Navara', 'Mazda BT-50', 'Mercedes-Benz X-Class', 'RAM 1500'],
  },
  {
    name: 'Package Type', slug: 'package_type', color: '#8b5cf6', order: 1,
    values: ['Companion', 'Initiator', 'Explorer', 'Tradesman'],
  },
  {
    name: 'Product Type', slug: 'product_type', color: '#ec4899', order: 2,
    values: ['Chassis Mount', 'Tray & Canopy', 'Canopy Only', 'Tray Only', 'Flat Tray'],
  },
  {
    name: 'Product Colour', slug: 'product_colour', color: '#f59e0b', order: 3,
    values: ['Colour Alignment', 'Single Colour Finish', 'Dual Colour Finish', 'Finish & Doors', 'GV8', 'UV Resistant Powder Coat'],
  },
  {
    name: 'Vehicle Colour', slug: 'vehicle_colour', color: '#14b8a6', order: 4,
    values: ['White', 'Black', 'Silver', 'Grey', 'Blue', 'Red', 'Brand Colour Code'],
  },
  {
    name: 'Category', slug: 'category', color: '#10b981', order: 5,
    values: ['Lifestyle', 'Indoor Product Shoot', 'Workshop/Build', 'Drone', 'Cinematic', '4WD', 'Scenic'],
  },
  {
    name: 'Feature', slug: 'feature', color: '#6366f1', order: 6,
    values: [
      'LED Tail Lights (284/355)', 'Dog Box', 'Slam-Shut Locking', 'Under Tray Drawer',
      'Under Tray Drawer Lids (Single & Dual)', 'Under Tray Toolboxes', 'Anderson Out',
      'Keyless Entry', 'Dual Colour LED Lighting', 'Internal LED Lighting', 'Slimline Roof Rack',
      'T-Channel Rails', 'X-Series Ladder Racks', 'X-Series Platform Racks', 'Roof Racks with Overhang',
      'Canopy Ladder', 'Jerry Can Holder', 'Spare Wheel Carrier', 'Internal Structure',
      'Internal Stability', 'Flush Floors', 'Flared Mudguards 45mm', 'Flared Mudguards 65mm',
      'Flared Mudguards 85mm', '2 Door Canopy', '3 Door Canopy', 'Lift Off System',
      'Dust Seals', 'Finger Pull Opening', 'Gas Struts',
    ],
  },
  {
    name: 'Orientation', slug: 'orientation', color: '#f97316', order: 7,
    values: ['Landscape', 'Portrait'],
  },
  {
    name: 'Tier', slug: 'tier', color: '#84cc16', order: 8,
    values: ['Tier 1 (Hero)', 'Stylistic'],
  },
];

async function seedFileTags() {
  console.log('🏷️  Seeding file tag categories...');
  for (const cat of categories) {
    const { values, ...catData } = cat;
    const existing = await prisma.tagCategory.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      console.log(`  ↩  ${cat.name} already exists, skipping`);
      continue;
    }
    const created = await prisma.tagCategory.create({ data: catData });
    for (let i = 0; i < values.length; i++) {
      await prisma.tagValue.create({ data: { categoryId: created.id, value: values[i], order: i } });
    }
    console.log(`  ✅ ${cat.name} (${values.length} values)`);
  }
  console.log('✅ File tag seed complete!');
}

seedFileTags().catch(console.error).finally(() => prisma.$disconnect());
