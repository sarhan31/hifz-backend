const axios = require('axios');

async function checkRisk() {
  try {
    const userId = "25b900a3-7fbc-4427-9b04-3a136eac0ff3";
    console.log(`Checking risks for user: ${userId}`);
    const res = await axios.get(`http://localhost:5000/api/memory-risk/${userId}`);
    console.log("Response Status:", res.status);
    console.log("Risk Data:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) {
        console.error("Data:", err.response.data);
    }
  }
}

checkRisk();
