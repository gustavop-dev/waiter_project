import { expect, test, type Page } from '@playwright/test'
import { DEMO_ADMIN, startShiftAs } from './helpers/odoo'
async function rpc<T>(page:Page,model:string,method:string,args:unknown[]):Promise<T>{
 return page.evaluate(async p=>{const r=await fetch('/odoo/web/dataset/call_kw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{...p,kwargs:{}},id:1})});const d=await r.json();if(d.error)throw new Error(d.error.data?.message??d.error.message);return d.result},{model,method,args})
}
test('inline editor moves at the pointer, rotates, resizes and persists walls, zones and capacity',async({page},testInfo)=>{
 test.setTimeout(180000)
 await page.goto('/login');await page.getByLabel('Correo').fill('admin');await page.getByLabel('Contraseña').fill('admin');await page.getByRole('button',{name:/Entrar|Abrir mi turno/}).click();await startShiftAs(page,DEMO_ADMIN.name,DEMO_ADMIN.pin)
 await page.waitForURL(/\/(salon|caja)$/)
 test.skip((await rpc<number>(page,'pos.session','search_count',[[['state','!=','closed']]]))!==0,'Se necesita caja cerrada; no se cierra un turno existente.')
 const name=`Plano prueba ${Date.now()}`
 let floorId:number|null=null
 try{
  await page.goto('/salon');await page.getByRole('button',{name:'Ajustes de mesas'}).click();await page.getByRole('button',{name:'Agregar piso',exact:true}).click()
  await expect(page.getByRole('main',{name:'Editor del restaurante'})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByLabel('Nombre del piso').fill(name)
  await page.getByLabel('Imagen de referencia').setInputFiles({name:'plano.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNCsAAAAASUVORK5CYII=','base64')})
  await page.getByLabel('Tamaño de la imagen',{exact:true}).fill('150')
  await expect(page.locator('svg image')).toHaveAttribute('width','1800')
  const canvas=page.getByLabel('Cuadrícula del restaurante');const box=(await canvas.boundingBox())!
  // El editor encuadra el plano al abrir: la cámara se lee del lienzo en vez de suponer un origen y un zoom fijos.
  const cam=await canvas.evaluate((el:Element)=>{const d=(el as SVGElement).dataset;return{x:Number(d.cameraX),y:Number(d.cameraY),zoom:Number(d.cameraZoom)}})
  const point=(x:number,y:number)=>({x:box.x+cam.x+x*cam.zoom,y:box.y+cam.y+y*cam.zoom})
  async function draw(tool:string,x:number,y:number,w:number,h:number){await page.getByRole('button',{name:tool,exact:true}).click();const a=point(x,y),b=point(x+w,y+h);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up()}
  await draw('Dibujar zona',0,0,800,600);await page.getByLabel('Nombre de zona').fill('Terraza nueva')
  await draw('Dibujar pared',0,650,800,20)
  await page.getByRole('button',{name:'Mesa personalizada',exact:true}).click()
  await page.getByText('Configuración avanzada',{exact:true}).click();await page.getByLabel('Capacidad (personas)').fill('7');await page.getByLabel('Ancho (celdas)').fill('12')
  await page.getByRole('button',{name:'Mesa pequeña',exact:true}).click()
  await expect(page.getByRole('button',{name:'Guardar',exact:true})).toBeDisabled()
  const second=page.getByRole('button',{name:/^Mesa 2, 4 personas/});const before=(await second.boundingBox())!
  await page.mouse.move(before.x+30,before.y+30);await page.mouse.down();const to=point(120,120);await page.mouse.move(to.x+30,to.y+30,{steps:8})
  const during=(await second.boundingBox())!
  expect(Math.abs(during.x-to.x)).toBeLessThanOrEqual(10);expect(Math.abs(during.y-to.y)).toBeLessThanOrEqual(10)
  await page.mouse.up();await expect(page.getByRole('button',{name:'Guardar',exact:true})).toBeEnabled()
  await page.getByRole('button',{name:'Mesa 1, 7 personas',exact:true}).click();await page.getByRole('button',{name:'Rotar'}).click()
  await expect(page.getByLabel('Ancho (celdas)')).toHaveValue('8')
  await page.getByLabel('Capacidad (personas)').fill('9')
  await page.getByRole('button',{name:'Acercar',exact:true}).click()
  const first=page.getByRole('button',{name:'Mesa 1, 9 personas',exact:true}), position=(await first.boundingBox())!
  await page.mouse.move(position.x+30,position.y+30);await page.mouse.down();await page.mouse.move(position.x+110,position.y+30,{steps:6})
  const moved=(await first.boundingBox())!;expect(Math.abs(moved.x-position.x-80)).toBeLessThanOrEqual(12);await page.mouse.up()
  await page.getByRole('button',{name:'Desplazar plano'}).click()
  const beforePan=(await first.boundingBox())!;await page.mouse.move(box.x+70,box.y+140);await page.mouse.down();await page.mouse.move(box.x+110,box.y+170,{steps:5});await page.mouse.up() // por debajo de la barra flotante
  expect(Math.abs((await first.boundingBox())!.x-beforePan.x-40)).toBeLessThanOrEqual(2)
  if(testInfo.project.name==='Tablet'){
   const cdp=await page.context().newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2
   const prior=await page.getByText(/^\d+%$/).innerText()
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-50,y,id:1},{x:x+50,y,id:2}]})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-90,y,id:1},{x:x+90,y,id:2}]})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
   await expect(page.getByText(/^\d+%$/)).not.toHaveText(prior)
  }
  await page.getByRole('button',{name:'Ver todo',exact:true}).click()
  await page.screenshot({path:'/tmp/waiter-dev/floor-editor.png'})

  await page.getByRole('button',{name:'Guardar',exact:true}).click();await expect(page.getByRole('main',{name:'Editor del restaurante'})).toHaveCount(0)
  const backgroundImage=page.getByTestId('floor-plan').locator('img')
  await expect(backgroundImage).toBeVisible()
  await expect.poll(()=>backgroundImage.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width>100)).toBe(true)
  const [floor]=await rpc<{id:number}[]>(page,'restaurant.floor','search_read',[[['name','=',name]],['name']]);floorId=floor.id
  const saved=await rpc<{backgroundSize:{width:number;height:number};tables:{seats:number;zone:string;width:number;height:number}[];walls:unknown[];zones:{name:string}[]}>(page,'restaurant.floor','waiter_read_plan',[[floorId]])
  expect(saved.backgroundSize).toEqual({x:0,y:0,width:1800,height:1200})
  expect(saved.tables.map(t=>t.seats)).toContain(9);expect(saved.tables.every(t=>t.zone)).toBe(true);expect(saved.walls).toHaveLength(1);expect(saved.zones[0].name).toBe('Terraza nueva')
  await page.reload();await page.getByRole('button',{name:'Ajustes de mesas'}).click();await page.getByRole('button',{name:new RegExp('^Editar piso '+name)}).click()
  await expect(page.getByLabel('Tamaño de la imagen',{exact:true})).toHaveValue('150')
  await page.getByRole('button',{name:'Mesa 1, 9 personas',exact:true}).click();await page.getByLabel('Capacidad (personas)').fill('20');await page.getByRole('button',{name:'Cancelar',exact:true}).click()
  const unchanged=await rpc<{tables:{seats:number}[]}>(page,'restaurant.floor','waiter_read_plan',[[floorId]])
  expect(unchanged.tables.map(t=>t.seats)).toContain(9)
  expect(await rpc(page,'pos.session','search_count',[[['state','!=','closed']]])).toBe(0)
 }finally{
  const floors=await rpc<{id:number}[]>(page,'restaurant.floor','search_read',[[['name','=',name]],['name']])
  if(floors.length)await rpc(page,'restaurant.floor','unlink',[floors.map(f=>f.id)])
 }
})
