# projectapp_bus — avisos en vivo del POS

Un canal por terminal, `waiter_pos_<config_id>`. El servidor manda `{"event": "kitchen"|"orders"|"notify"}`
cuando algo cambia y la tablet vuelve a leer por donde ya leía; el aviso no lleva datos.

`waiter.bus.waiter_send(config_ids, event)` es lo que llaman los otros addons.
`waiter.bus.waiter_bus_info()` devuelve `{version, channels}`: la versión que Odoo exige en el handshake
del websocket (cambia entre versiones, por eso se pregunta) y los canales del usuario.

El POS se conecta a `/websocket?version=…` por el mismo origen (el proxy de Next) y, si el bus no
levanta, sigue sondeando como antes: el bus acelera, no es un requisito.
