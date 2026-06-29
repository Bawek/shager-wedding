const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const ServiceCategory = require('../models/ServiceCategory');
const Service = require('../models/Service');
const Cart = require('../models/Cart');
const ServiceRequest = require('../models/ServiceRequest');
const SystemSettings = require('../models/SystemSettings');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

dotenv.config();

const seed = async () => {
  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shager-wedding');
    console.log('Connected to MongoDB. Clearing databases...');

    // Clear existing data
    await User.deleteMany();
    await ServiceCategory.deleteMany();
    await Service.deleteMany();
    await Cart.deleteMany();
    await ServiceRequest.deleteMany();
    await SystemSettings.deleteMany();
    await Notification.deleteMany();
    await AuditLog.deleteMany();

    console.log('Databases cleared. Creating default system settings...');
    const settings = await SystemSettings.create({
      storeName: 'Shager Wedding Store',
      contactEmail: 'contact@shagerwedding.com',
      contactPhone: '+251 911 223344',
      physicalAddress: 'Bole, Addis Ababa, Ethiopia',
      currency: 'ETB',
      allowSelfRegistration: true,
      maxServicesInCart: 8
    });

    console.log('Creating categories...');
    const categoriesData = [
      { name: 'Photography & Videography', icon: 'camera', sort_order: 1 },
      { name: 'Decoration & Design', icon: 'palette', sort_order: 2 },
      { name: 'Catering & Cakes', icon: 'cake', sort_order: 3 },
      { name: 'Music & Sound', icon: 'music', sort_order: 4 },
      { name: 'Venues & Halls', icon: 'home', sort_order: 5 },
      { name: 'Makeup & Styling', icon: 'user', sort_order: 6 }
    ];
    const categories = await ServiceCategory.insertMany(categoriesData);

    const findCatId = (name) => categories.find(c => c.name === name)._id;

    console.log('Creating services...');
    const servicesData = [
      {
        name: 'Premium Wedding Photography & Video Package',
        category: findCatId('Photography & Videography'),
        description: 'Full day coverage with 2 professional photographers, 1 videographer, drone footage, luxury album, and digital delivery.',
        price_min: 45000,
        price_max: 75000,
        images: ['https://images.unsplash.com/photo-1537907690979-ee8e01276184']
      },
      {
        name: 'Standard Studio Photo Shoot',
        category: findCatId('Photography & Videography'),
        description: '3 hours studio session with 3 outfit changes, 20 high-end retouched prints, and soft copy backup.',
        price_min: 15000,
        price_max: 25000,
        images: ['https://images.unsplash.com/photo-1519741497674-611481863552']
      },
      {
        name: 'Luxury Stage & Venue Decoration',
        category: findCatId('Decoration & Design'),
        description: 'Elite stage backdrop design, runway fresh flower installations, pathway lights, and table centerpiece setups for up to 500 guests.',
        price_min: 60000,
        price_max: 120000,
        images: ['https://images.unsplash.com/photo-1519225495810-7512c696505a']
      },
      {
        name: 'Traditional Buffet Catering',
        category: findCatId('Catering & Cakes'),
        description: 'Diverse traditional Ethiopian dishes (Injera, Wot varieties) alongside continental options, with professional serving staff.',
        price_min: 450,
        price_max: 800, // Per guest price
        images: ['https://images.unsplash.com/photo-1555244162-803834f70033']
      },
      {
        name: '5-Tier Vanilla & Chocolate Wedding Cake',
        category: findCatId('Catering & Cakes'),
        description: 'Custom-designed 5-tier wedding cake with edible sugar flowers, fondant decorations, and flavored tiers.',
        price_min: 12000,
        price_max: 20000,
        images: ['https://images.unsplash.com/photo-1535254973040-607b474cb50d']
      },
      {
        name: 'DJ & Sound System Setup',
        category: findCatId('Music & Sound'),
        description: 'High-fidelity audio setup with 4 line-array speakers, wireless mics, moving head lights, smoke machines, and a professional DJ.',
        price_min: 18000,
        price_max: 30000,
        images: ['https://images.unsplash.com/photo-1470225620780-dba8ba36b745']
      },
      {
        name: 'Bole Luxury Garden Hall',
        category: findCatId('Venues & Halls'),
        description: 'Stunning outdoor garden venue coupled with an elegant indoor banquet hall suitable for up to 600 guests. Ample parking included.',
        price_min: 80000,
        price_max: 150000,
        images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3']
      },
      {
        name: 'Bridal Makeup & Hair Styling',
        category: findCatId('Makeup & Styling'),
        description: 'Premium airbrush bridal makeup, hair styling, trial run session, and bridesmaid makeup touch-ups.',
        price_min: 8000,
        price_max: 15000,
        images: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f']
      }
    ];
    const services = await Service.insertMany(servicesData);

    console.log('Creating users (Admin, Manager, Team, Customer)...');
    const usersData = [
      {
        name: 'System Admin',
        email: 'admin@shagerwedding.com',
        password: 'AdminPass123!',
        phone: '+251 911 111111',
        role: 'admin',
        status: 'active'
      },
      {
        name: 'Store Manager',
        email: 'manager@shagerwedding.com',
        password: 'ManagerPass123!',
        phone: '+251 911 222222',
        role: 'manager',
        status: 'active'
      },
      {
        name: 'Tariku Photo-Expert',
        email: 'photo_team@shagerwedding.com',
        password: 'TeamPass123!',
        phone: '+251 911 333333',
        role: 'team',
        status: 'active'
      },
      {
        name: 'Hana Decorator',
        email: 'decor_team@shagerwedding.com',
        password: 'TeamPass123!',
        phone: '+251 911 444444',
        role: 'team',
        status: 'active'
      },
      {
        name: 'Selam Customer',
        email: 'customer@shagerwedding.com',
        password: 'CustomerPass123!',
        phone: '+251 911 555555',
        role: 'customer',
        status: 'active',
        profile: {
          weddingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // in 30 days
          venue: 'Sheraton Addis'
        }
      }
    ];

    const seededUsers = [];
    for (const u of usersData) {
      // pre-save bcrypt triggers on model create
      const user = await User.create(u);
      seededUsers.push(user);
    }

    const customer = seededUsers.find(u => u.role === 'customer');

    console.log('Creating customer cart...');
    await Cart.create({
      user: customer._id,
      items: [
        {
          service: services.find(s => s.name.includes('Photography'))._id,
          custom_notes: 'Prefer drone shots during the ring exchange ceremony.'
        },
        {
          service: services.find(s => s.name.includes('Cake'))._id,
          custom_notes: 'Gold frosting themes only, please.'
        }
      ]
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seed();
