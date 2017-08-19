/* jshint esversion: 6 */

load("api_http.js");
load("api_file.js");
load('api_timer.js');

//print("Importing JSON:");
let cfg_file = File.read('conf5.json');
let thx = JSON.parse(cfg_file);

let useProxy = true;
let thx_thinx_proxy = thx.THINX_PROXY; // should be your proxy IP otherwise Mongoose will resolve using 8.8.8.8 and fail

///

// can it LET?
let thx_connected_response = {
  status: "connected"
};
let thx_disconnected_response = {
  status: "disconnected"
};
let thx_reboot_response = {
  status: "rebooting"
};
let thx_update_question = {
  title: "Update Available",
  body: "There is an update available for this device. Do you want to install it now?",
  type: "actionable",
  response_type: "bool"
};
let thx_update_success = {
  title: "Update Successful",
  body: "The device has been successfully updated.",
  type: "success"
};

///

function thinx_device_mac() {
  return "FA:KE:BU:TG:00:D0";

  /* Returns <???-562948879850768> or crashes
  print("Getting mac address...");
  let get_mac_address = ffi('char * get_mac_address()');
  print("MAC: ");
  let result = get_mac_address();
  print(result);
  return result;
  */
}

function registration_json_body() {
    return { 'registration': {
      mac: thinx_device_mac(),
      firmware: thx.THINX_FIRMWARE_VERSION,
      commit: thx.THINX_COMMIT_ID,
      version: thx.THINX_FIRMWARE_VERSION_SHORT,
      checksum: thx.THINX_COMMIT_ID,
      alias: thx.THINX_ALIAS,
      udid: thx.THINX_UDID,
      owner: thx.THINX_OWNER,
      platform: 'mongoose'
    }
  };
}

function headers() {
  return {
      'Authentication': thx.THINX_API_KEY,
      'Accept': 'application/json',
      'Origin': 'device',
      'Content-type': 'application/json',
      'User-Agent': 'THiNX-Client'
    }
}

// Hardcoded registration process
function thinx_register() {
  //restore_device_info()
  print("Registering...");

  let url = "http://thinx.cloud:7442/device/register";
  if (useProxy) {
    url = "http://" + thx_thinx_proxy + ":7442/device/register";
    print("Trying proxy..."+url);
  } else {
    url = "http://207.154.230.212:7442/device/register";
    print("Trying cloud..."+url);
  }
  //207.154.230.212
  //Net.connect??
  print("WARNING! DOES NOT CHECK FOR CORRECT CONNECTIVITITY");
  let rheaders = JSON.stringify(headers());
  print("Request headers:"+rheaders);
  let rbody = JSON.stringify(registration_json_body());
  print("Request body:"+rbody);
  // sends data but body is missing!!! why?
  HTTP.query({
    url: url,
    headers: headers(),
    data: registration_json_body(),
    success: function(body, full_http_msg) {

      if (body === "no_registration_info") {
        print("The code is wrong. Let's fix it.");
        
        return;
      } else {
        print(full_http_msg);
      }

      print("Registration response:");
      print(body);

      let json = JSON.parse(body);
      print(JSON.stringify(json));
      let reg = json.registration;
      if (reg) {
        
        //{"registration":
        //{"status":"OK",
        //"udid":"f8e88e40-43c8-11e7-9ad3-b7281c2b9610",
        // "alias":"wrooom-esp32-dev",
        // "owner":"cedc16bb6bb06daaa3ff6d30666d91aacd6e3efbf9abbc151b4dcade59af7c12",
        // "success":true}} 

        let udid = reg.udid;
        if (udid) {
          print(JSON.stringify(reg));
          thx.THINX_UDID = udid;
          print("Saving UDID: ");
          print(reg.udid);
          let data = JSON.stringify(thx);
          File.write(data, "conf5.json");
        }
      }

    },
    error: function(err) {
      print("Registration error:");
      print(JSON.stringify(err));
      useProxy = !useProxy;
      thinx_register(useProxy);
    },
  });
}

thinx_register(useProxy);

// delayed retry...
function register_if_connected() {
  print("THiNX: register_if_connected()")
  let wifi_change = ffi('char* mgos_wifi_get_status_str()');
  print('WIFI STATUS CHECK');
  print(wifi_change);
  let MGOS_WIFI_CONNECTED = 2;
  if (wifi_change === MGOS_WIFI_CONNECTED) {
    print("THiNX: Register on MGOS_WIFI_CONNECTED:")
    thinx_register(useProxy);
  }
}

Timer.set(60000, true, function() {
  print("THiNX: Register on Timer:")
  register_if_connected()
}, null);

register_if_connected();



///
