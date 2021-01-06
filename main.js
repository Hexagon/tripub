const path = require('path'),
    { network, encryption } = require("decene"),
    fs = require('fs'),
    os = require('os'),
    { app, Menu, Tray, } = require('electron');

let tray = null,
    identityCache = os.homedir() + '/.decene.tripub.id',
    registryCache = os.homedir() + '/.decene.tripub.registry.cache';

app.on('ready', () => {
  tray = new Tray(path.join(__dirname, '/assets/tripub-icon.png'));

  const menu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      click() { app.quit(); }
    }
  ]);

  let lastStatus = '',
      lastIp = 'unknown',
      lastType = 'none',
      updateTooltip = (_lastIp,_lastType,_lastStatus) => {
          if (lastType === "none") {
            tray.setToolTip('Status: ' + lastStatus);
          } else {
            tray.setToolTip('IP: '  + _lastIp + " (" + _lastType + ")");
          }
      };

  tray.setToolTip('Booting');
  lastStatus = 'Booting';
  tray.setContextMenu(menu);

  // Create new identity?
    id = encryption.loadIdentity(identityCache);
    if (!d) {
        id = encryption.newIdentity(identityCache); 
    }

    // If unable to create identity, show that in tray and return
    if (!id) {
        tray.setToolTip('Could not create identity cache in ' + identityCache);
        return;
    }

    // Try to load registry cache
    var cache;
    try {
        cache = JSON.parse(fs.readFileSync(registryCache, 'utf8'));
    } catch (err) {
        tray.setToolTip('Could not read registry cache in ' + identityCache);
    }

    // Init decene
    var d = new network(id,"0.0.0.0",47474,"56k.guru:47474",registryCache);

    d.tryUpnp();

    d.events.on('server:error', (err) => { lastStatus = "Error: " + err; updateTooltip(lastIp,lastType,lastStatus)});
    d.events.on('socket:error', (err) => { lastStatus = "Error: " + err; updateTooltip(lastIp,lastType,lastStatus)});
    d.events.on('error', (err) => { lastStatus = "Error: " + err; updateTooltip(lastIp,lastType,lastStatus)});

    d.events.on('server:listening', (port) => { lastStatus = "Listening on " + port; updateTooltip(lastIp,lastType,lastStatus)});
    d.events.on('ip:changed',(ip) => {
        lastIp = ip.ip;
        lastType = ip.type;
        lastStatus = ' IP updated ' + new Date().toISOString();
        updateTooltip(lastIp,lastType,lastStatus);
    });
    
    // Handle registry cache
    d.events.on('registry:batch', (node) => {
        fs.writeFile(registryCache, JSON.stringify(d.reg.serialize()), err => {
        if (err) {
            lastStatus = "Registry cache update failed";
            return;
        } else {
            lastStatus = "Registry cache updated";
        }
        })
    });

});
