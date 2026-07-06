const { sequelize, User } = require('./models');

async function seed() {
  try {
    await sequelize.sync({ force: true }); // This resets the DB!
    await User.create({
      username: 'admin',
      password: 'password123',
      fullName: 'المدير العام',
      email: 'admin@makhsoos.com',
      phone: '01000000000',
      role: 'SuperAdmin',
      status: 'Active',
      workingHours: 8,
      avatar: 'Crown'
    });
    console.log("Database seeded successfully with default admin user!");
    console.log("Username: admin");
    console.log("Password: password123");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit();
  }
}

seed();
