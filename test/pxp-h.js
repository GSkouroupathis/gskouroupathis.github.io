/*const options = {
    "config": {
    "flow": "SMOTQC",
    "language": "en-GB",
    "initial_search": "Zuiderlaan 1-3/bus 5, 9000 Gent, Belgium",
    "intent": "schedule",
    "oauth": {
        "resource_code": "XYZ"
    },
    "subject": {
        "ids": "ext-1,ext-2,ext-3",
        "type": "externalId"
    },
    "office": {
        "ids": "1"
    },
    "meeting_types": "office,video",
    "employee": {
        "ids": "1"
    },
    "customer": {
        "first_name": "Simon",
        "last_name": "Van den Broeck",
        "email": "simon.vandenbroeck@pexip.com",
        "phone_number": "+32477112233",
        "customer_number": "123",
        "timezone": "Europe/Brussels",
        "company": "Pexip",
        "date_of_birth": "05/08/1994",
        "external_id": "EXT-123",
        "gender": "male",
        "is_existing": true,
        "language": "en",
        "location": {
            "geolocation": "51.05;3.71667",
            "city": "Gent",
            "country": "Belgium",
            "postal_code": "9000",
            "state": "Oost-Vlaanderen",
            "street_1": "Zuiderlaan 1-3/bus 5"
        }
    },
    "application": {
        "timezone_selection": "enable_timezone_selection"
    },
    "search_countries": "BE,NL,FR"
    }
}
*/

// Since the global is installed async, when our code runs, it might not be available yet.
function getEngagePlugin() {
    return new Promise((resolve) => {
      if (window.PexipEngage?.Plugin) resolve(window.PexipEngage?.Plugin);
  
      // if not available, listen for any event, global will be available then.
      function listener() {
        resolve(window.PexipEngage?.Plugin);
        document.removeEventListener("SkedifyPluginEvent", listener);
      }
  
      document.addEventListener("SkedifyPluginEvent", listener);
    });
  }
  
  // use the `awaitFirstInstance` API to get a Promise with the first available instance.
  function getPluginInstance() {
    return getEngagePlugin().then((plugin) => plugin.awaitFirstInstance());
  }
  
  getPluginInstance().then((instance) => {
    // interact with the PexipEngagePlugin here.
    console.log('[*] All good')
  });

