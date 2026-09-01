try { console.log("1:", JSON.parse('{"a": "\\\\s"}')); } catch(e) { console.log("1 err", e.message); }
try { console.log("2:", JSON.parse('{"a": "\\s"}')); } catch(e) { console.log("2 err", e.message); }
