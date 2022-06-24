import 'dotenv/config'
import Fastify from 'fastify'
import NodeCache from 'node-cache'
import proxy from '@fastify/http-proxy'
import cors from '@fastify/cors'
import fs from 'fs'


const appCache = new NodeCache({
    deleteOnExpire: true,
    // 15 mins in seconds
    stdTTL: 15 * 60,
});
const fastify = Fastify({
    logger: true
});


(async ()=>{
    fastify.register(cors,{
        origin: true,
        preflight: true
    })
    fastify.addHook('preValidation',async (req, rep)=>{
        if(req.method === 'POST'){
            try {
                
            if(!req.body){
                throw new Error('Must have a body')
            }
            const body = req.body;
            console.log(body);

            const params = body.params;
            if(!params) {
                return
            }

            if(params.length === 0){
                return
            }
            const data = params[0];
            if(!data){
                throw new Error('No data');
            }
            if(data.hasOwnProperty('from')){
                let whiteList = appCache.get('whiteList')
                if(!whiteList){
                     whiteList = await new Promise((resolve, reject)=>{
                        fs.readFile('./whitelist.json','utf-8',(err,data)=>{
                            if(err){reject(err);return;}
                            resolve(data)
                        })
                    })
                    const success = appCache.set('whiteList', whiteList)
                    if(!success){
                        // TODO: Send something somewhere
                    }
                }
                const jsonWhitelist = JSON.parse(whiteList)
                if(!jsonWhitelist.addresses.includes(data.from.toLowerCase())){
                    throw new Error('You have to own the nft. If you just got the nft wait 15 mins.')
                }
            }
            } catch (err) {
                console.log(err.message)
                /* handle error */
                throw err
            }
        } 
    })
    fastify.register(proxy, {
        upstream: process.env.API_SERVICE_URL,
        prefix: '',
        proxyPayloads: false,
    })

    fastify.listen({port: 3005}, (err, address) => {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
})()
