const axios = require("axios");

async function testHistoryAPI() {
  try {
    console.log("Testing history API endpoint...\n");

    // Replace with your actual JWT token from login
    const token = "YOUR_JWT_TOKEN_HERE";

    const response = await axios.get("http://localhost:5000/api/readings/history", {
      params: {
        serialNumber: "GM-001",
        limit: 10
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log(`Status: ${response.status}`);
    console.log(`Total readings: ${response.data.count}\n`);

    if (response.data.readings && response.data.readings.length > 0) {
      console.log("Latest 3 readings:");
      response.data.readings.slice(0, 3).forEach((reading, i) => {
        console.log(`\n${i + 1}. Time: ${new Date(reading.createdAt).toLocaleString()}`);
        console.log(`   Flow_Rate: ${reading.Flow_Rate}`);
        console.log(`   Pressure: ${reading.Pressure}`);
        console.log(`   Total_Units: ${reading.Total_Units}`);
        console.log(`   Daily_consumption: ${reading.Daily_consumption}`);
        console.log(`   Monthly_Units: ${reading.Monthly_Units}`);
      });
    } else {
      console.log("No readings found");
    }
  } catch (error) {
    if (error.response) {
      console.error(`Error ${error.response.status}:`, error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

testHistoryAPI();
