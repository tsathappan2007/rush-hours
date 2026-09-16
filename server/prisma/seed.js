import { PrismaClient, StockMode, OrderStatus, StaffRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Rush Hours database seed...');

  // Clean existing records in reverse dependency order
  await prisma.pickupToken.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.student.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.canteen.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // ----------------------------------------------------
  // 1. Create Canteens
  // ----------------------------------------------------
  const canteen1 = await prisma.canteen.create({
    data: {
      name: 'Main Campus Food Court',
      code: 'MAIN-FC',
      description: 'Central campus dining hall offering South Indian meals, quick bites, and fresh beverages.',
      location: 'Ground Floor, Student Activity Center (SAC)',
      openingTime: '08:00',
      closingTime: '20:30',
      isActive: true,
    },
  });

  const canteen2 = await prisma.canteen.create({
    data: {
      name: 'North Block Cafe',
      code: 'NORTH-CAN',
      description: 'Quick-service cafe serving hot rolls, pastries, bakery snacks, and espresso drinks.',
      location: 'North Academic Block, 1st Floor',
      openingTime: '09:00',
      closingTime: '19:00',
      isActive: true,
    },
  });

  console.log(`✅ Created 2 canteens: "${canteen1.name}" & "${canteen2.name}"`);

  // ----------------------------------------------------
  // 2. Create Time Slots
  // ----------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  const slot1 = await prisma.timeSlot.create({
    data: {
      canteenId: canteen1.id,
      slotDate: todayStr,
      startTime: '12:30',
      endTime: '12:45',
      maxOrders: 25,
      currentOrders: 2,
    },
  });

  await prisma.timeSlot.create({
    data: {
      canteenId: canteen1.id,
      slotDate: todayStr,
      startTime: '12:45',
      endTime: '13:00',
      maxOrders: 25,
      currentOrders: 0,
    },
  });

  await prisma.timeSlot.create({
    data: {
      canteenId: canteen2.id,
      slotDate: todayStr,
      startTime: '13:00',
      endTime: '13:15',
      maxOrders: 20,
      currentOrders: 0,
    },
  });

  console.log('✅ Created pickup time slots with order caps.');

  // ----------------------------------------------------
  // 3. Create Menu Items & Stock for Canteen 1 (Main Food Court)
  // ----------------------------------------------------
  // Countable item: Samosa
  const samosa = await prisma.menuItem.create({
    data: {
      canteenId: canteen1.id,
      name: 'Crispy Punjabi Samosa (2 pcs)',
      description: 'Golden fried savory pastry filled with spiced potato and peas. Served with mint chutney.',
      price: 30.00,
      category: 'Snacks',
      stockMode: StockMode.COUNTABLE,
      isAvailable: true,
      stock: {
        create: {
          quantity: 40,
          dailyTotal: 60,
        },
      },
    },
  });

  // Countable item: Fresh Lime Soda
  const limeSoda = await prisma.menuItem.create({
    data: {
      canteenId: canteen1.id,
      name: 'Fresh Mint Lime Soda',
      description: 'Chilled sparkling lime drink with crushed fresh mint.',
      price: 35.00,
      category: 'Beverages',
      stockMode: StockMode.COUNTABLE,
      isAvailable: true,
      stock: {
        create: {
          quantity: 25,
          dailyTotal: 40,
        },
      },
    },
  });

  // Slot-capacity item: South Indian Executive Thali (made per order batch)
  const thali = await prisma.menuItem.create({
    data: {
      canteenId: canteen1.id,
      name: 'South Indian Executive Thali',
      description: 'Steamed rice, sambar, rasam, kootu, poriyal, papad, curd, and dessert.',
      price: 85.00,
      category: 'Meals',
      stockMode: StockMode.SLOT_CAPACITY,
      isAvailable: true,
    },
  });

  // Slot-capacity item: Veg Hakka Noodles
  const noodles = await prisma.menuItem.create({
    data: {
      canteenId: canteen1.id,
      name: 'Wok Tossed Veg Hakka Noodles',
      description: 'Fresh street-style stir-fried noodles with crunchy vegetables.',
      price: 70.00,
      category: 'Meals',
      stockMode: StockMode.SLOT_CAPACITY,
      isAvailable: true,
    },
  });

  // ----------------------------------------------------
  // 4. Create Menu Items & Stock for Canteen 2 (North Block Cafe)
  // ----------------------------------------------------
  const paneerRoll = await prisma.menuItem.create({
    data: {
      canteenId: canteen2.id,
      name: 'Paneer Tikka Kathi Roll',
      description: 'Flaky paratha stuffed with char-grilled spicy paneer, onions, and sauces.',
      price: 75.00,
      category: 'Rolls & Wraps',
      stockMode: StockMode.COUNTABLE,
      isAvailable: true,
      stock: {
        create: {
          quantity: 15,
          dailyTotal: 30,
        },
      },
    },
  });

  const coldCoffee = await prisma.menuItem.create({
    data: {
      canteenId: canteen2.id,
      name: 'Cold Coffee with Ice Cream',
      description: 'Creamy blended cold brew topped with vanilla ice cream and chocolate drizzle.',
      price: 60.00,
      category: 'Beverages',
      stockMode: StockMode.COUNTABLE,
      isAvailable: true,
      stock: {
        create: {
          quantity: 20,
          dailyTotal: 35,
        },
      },
    },
  });

  const grilledSandwich = await prisma.menuItem.create({
    data: {
      canteenId: canteen2.id,
      name: 'Cheese & Corn Grilled Sandwich',
      description: 'Toasted multi-grain bread with mozzarella, sweet corn, and herbs.',
      price: 55.00,
      category: 'Snacks',
      stockMode: StockMode.SLOT_CAPACITY,
      isAvailable: true,
    },
  });

  console.log('✅ Created menu items and stock balances (Countable & Slot Capacity).');

  // ----------------------------------------------------
  // 5. Create Students
  // ----------------------------------------------------
  const student1 = await prisma.student.create({
    data: {
      rollNumber: '21CS101',
      fullName: 'Sathappan T',
      email: 'sathappan@college.edu',
      phone: '+91 9876543210',
      passwordHash: '$2b$10$SampleHashedPasswordForStudentDevUseOnly1',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      rollNumber: '21CS102',
      fullName: 'Hariharan K',
      email: 'hariharan@college.edu',
      phone: '+91 9876543211',
      passwordHash: '$2b$10$SampleHashedPasswordForStudentDevUseOnly2',
    },
  });

  console.log('✅ Created sample students: Sathappan & Hariharan.');

  // ----------------------------------------------------
  // 6. Create Staff (linked to Canteens)
  // ----------------------------------------------------
  await prisma.staff.create({
    data: {
      canteenId: canteen1.id,
      staffCode: 'STF-MAIN-01',
      fullName: 'Ramesh Kumar',
      email: 'ramesh.canteen@college.edu',
      passwordHash: '$2b$10$SampleHashedPasswordForStaffDevUseOnly1',
      role: StaffRole.MANAGER,
    },
  });

  await prisma.staff.create({
    data: {
      canteenId: canteen2.id,
      staffCode: 'STF-NORTH-01',
      fullName: 'Anita Sharma',
      email: 'anita.canteen@college.edu',
      passwordHash: '$2b$10$SampleHashedPasswordForStaffDevUseOnly2',
      role: StaffRole.COUNTER_STAFF,
    },
  });

  console.log('✅ Created sample canteen staff members.');

  // ----------------------------------------------------
  // 7. Create a Sample Active Order with Pickup Token
  // ----------------------------------------------------
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'RH-2026-001',
      studentId: student2.id,
      canteenId: canteen1.id,
      timeSlotId: slot1.id,
      status: OrderStatus.READY,
      totalAmount: 100.00,
      razorpayOrderId: 'order_sample_rzp_12345',
      razorpayPaymentId: 'pay_sample_rzp_67890',
      paidAt: new Date(),
      orderItems: {
        create: [
          {
            menuItemId: noodles.id,
            quantity: 1,
            unitPrice: 70.00,
            subtotal: 70.00,
          },
          {
            menuItemId: samosa.id,
            quantity: 1,
            unitPrice: 30.00,
            subtotal: 30.00,
          },
        ],
      },
      pickupToken: {
        create: {
          otpCode: '7492',
          qrPayload: 'rh_pickup_token_sample_payload_hash_2026_001',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Valid for 1 hour
        },
      },
    },
  });

  console.log(`✅ Created sample order: ${sampleOrder.orderNumber} (OTP: 7492, Status: READY)`);
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
