const { Keyring } = require('@polkadot/keyring');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const cloverTypes = require('@clover-network/node-types');
const BN = require('bn.js');
// const _ = require('lodash');
// const fs = require('fs');
const prompts = require('prompts');
// const bluebird = require('bluebird');
const { checkAddress } = require('@polkadot/util-crypto');
const BigNumber = require('bignumber.js');
const config = require('./.env.json');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
  
const keyring = new Keyring({
  ss58Format: 42,
  type: 'sr25519',
});

function hexToText(hexString) {
    const buffer = Buffer.from(hexString.substring(2), 'hex'); // 移除 '0x' 前缀并创建一个新的Buffer
    return buffer.toString('ascii'); // 将Buffer转换为ASCII字符串
}

function parseEventData(event) {
  let data = event.data.toString();
  try {
    data = JSON.parse(data);
  } catch(e){}
  return {
    section: event.section,
    method: event.method,
    data: data
  }
}
  

const baseDecimals = new BN(10).pow(new BN(18));

function toBigNumber(bnNumber) {
  return new BigNumber(bnNumber.toString())
}

async function loadCloverApi() {
  const wsProvider = new WsProvider(config.api);
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: cloverTypes,
  });
  await api.isReady;
  return api;
}

async function main() {
  const api = await loadCloverApi();
//   await bluebird.delay(1000);
await delay(1000);

  const signer = keyring.addFromUri(config.account);

  await subscribe(api);
}

async function protocol_owner_fee(api) {
    const result = await api.query.cloverCrc20.protocolOwnerFee();
    console.log('protocol_owner_fee:',result.toString())
}

async function tickerInfo(api, name) {
    // console.log('api.query.cloverCrc20:', api.query.cloverCrc20);
  const result = await api.query.cloverCrc20.tickInfo(name);
  console.log('tickInfo:', name,result.toString())
  const jsonObj = JSON.parse(result.toString());
  console.log('tokenInfo json:', jsonObj)
  const data = {
    owner: jsonObj[0],
    tick: hexToText(jsonObj[1]),
    max: new BigNumber(jsonObj[2]).toFixed(0),
    limit: new BigNumber(jsonObj[3]).toFixed(0),
    fee:new BigNumber(jsonObj[4]).toFixed(0),
    fee_to: jsonObj[5]
  }
  console.log('tick data:', data);
}

async function deploy(api, signer) {
  const max = "1000000000000000000000";
  const limit = "100000000000000000000";
  const mint_fee = '10';
  const mint_fee_to = signer.address;
  const nonce = await api.rpc.system.accountNextIndex(signer.address);
  const signedTransaction = await api.tx.cloverCrc20
    .deploy("TAABB", max, limit, mint_fee, mint_fee_to)
    .sign(signer, { nonce });
  const result = await signedTransaction.send();
  console.log('deploy TAABB result:', result.toString());
}

async function checkAccountBalance(api, account, log) {
  const data = await api.query.system.account(account);
  console.log(
    `account '${account}' balance: ${
      data.data.free.div(baseDecimals).toString()
    } CLV`
  );
  return data.data.free
}

async function subscribe(api) {
    console.log('subscribe...')
    const cloverCrc20Address = '5Fb...'; // 替换成您的Clover CRC20合约地址

    // 监听系统事件
    const unsub = await api.query.system.events((events) => {
    events.forEach((record) => {
        const { event, phase } = record;
        const types = event.typeDef;
        console.log('event section, method, data:', event.section, event.method, event.data.toString());
        console.log('event data:', parseEventData(event));
        console.log('phase:', phase.toString());
        
        // if (event.section === 'contracts' && event.method === 'ContractEmitted') {
        //   let [contractAddress, eventData] = event.data;
        
        //   // 检查是否为cloverCrc20合约的事件
        //   if (contractAddress.toString() === cloverCrc20Address) {
        //     console.log(`Event from cloverCrc20 contract at phase ${phase}:`);
        //     console.log(eventData.toString());
            
        //     // 你可以进一步处理eventData以获取更多信息或者执行操作
            
        //     // 如果只关注交易被确认时的事件，则可以取消订阅
        //     if (status.isFinalized) {
        //       unsub();
        //     }
        //   }
        // }
    });
    });
}

main()
