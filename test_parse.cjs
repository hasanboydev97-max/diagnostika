try { 
  JSON.parse("{\"q\": \"\\sin\"}"); 
  console.log("Success"); 
} catch(e) { 
  console.log("Error:", e.message); 
}
