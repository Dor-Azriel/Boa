import { join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import serveStatic from 'serve-static';

import shopify from './shopify.js';
import webhooks from './webhooks.js';

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);




import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const saveOrder = async (order) => {
	console.log(order);
	try {
	  const itemsData = order.items.map((item) => ({
		value: item, 
	  }));
  
	  // Find the existing order and its related items
	  const existingOrder = await prisma.savedOrder.findUnique({
		where: {
		  id: order.id,
		},
		include: {
		  items: true,
		},
	  });
  
	  if (existingOrder) {
		// Delete related items
		await prisma.item.deleteMany({
		  where: {
			savedOrderId: order.id,
		  },
		});
  
		// Delete order
		await prisma.savedOrder.delete({
		  where: {
			id: order.id,
		  },
		});
  
		// Create a new order
		const newOrder = await prisma.savedOrder.create({
		  data: {
			id: order.id,
			items: {
			  create: itemsData,
			},
		  },
		});
  
		console.log('Order deleted, and new one created:', newOrder);
		return newOrder;
	  } else {
		// Order with the given ID doesn't exist, create a new one
		const newOrder = await prisma.savedOrder.create({
		  data: {
			id: order.id,
			items: {
			  create: itemsData,
			},
		  },
		});
  
		console.log('New order created:', newOrder);
		return newOrder;
	  }
	} catch (error) {
	  console.error('Error saving order:', error);
	  throw error;
	} finally {
	  await prisma.$disconnect();
	}
  };
  
  



const STATIC_PATH =
	process.env.NODE_ENV === 'production'
		? `${process.cwd()}/frontend/dist`
		: `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
	shopify.config.auth.callbackPath,
	shopify.auth.callback(),
	shopify.redirectToShopifyOrAppRoot()
);
app.post(
	shopify.config.webhooks.path,
	// @ts-ignore
	shopify.processWebhooks({ webhookHandlers: webhooks })
);

// All endpoints after this point will require an active session
app.use('/api/*', shopify.validateAuthenticatedSession());

app.use(express.json());

app.use(serveStatic(STATIC_PATH, { index: false }));

app.post('/api/saveOrder', (req, res) => {
	try{
	 const ans = saveOrder(req.body);
	 res.send({status: 'New order saved.'});
	} catch (err) {
		res.send({status: 'Error occurred while trying to save order'});
	}
});


app.use('/*', shopify.ensureInstalledOnShop(), async (_req, res) => {
	return res.set('Content-Type', 'text/html').send(readFileSync(join(STATIC_PATH, 'index.html')));
});

 

app.listen(PORT);

