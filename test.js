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
  const limit = "100000000000000";
  const mint_fee = '100';
  const mint_fee_to = signer.address;
  const nonce = await api.rpc.system.accountNextIndex(signer.address);
  const signedTransaction = await api.tx.cloverCrc20
    .deploy("TABA", max, limit, mint_fee, mint_fee_to)
    .sign(signer, { nonce });
  const result = await signedTransaction.send();
  console.log('deploy TABA result:', result.toString());
}


async function mint(api, signer) {
    const nonce = await api.rpc.system.accountNextIndex(signer.address);
    const signedTransaction = await api.tx.cloverCrc20
      .mint("TABA", '1')
      .sign(signer, { nonce });
    const result = await signedTransaction.send();
    console.log('mint TAAA result:', 1, result.toString());
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

const balanceOf = async (tick, api, signer) => {
  const result = await api.query.cloverCrc20.balanceForTickAddress(tick, signer.address);
  console.log('balanceForTickAddress:',result.toString())
}

async function getEventByHash(api, blockHash) {
    console.log('getEventByHash...')
    const dateTime = await api.query.timestamp.now.at(blockHash);

  console.log(`Block time: ${dateTime}, ${new Date(dateTime.toNumber()).toISOString()}`);

    
    // 获取区块数据
    // const signedBlock = await api.rpc.chain.getBlock(blockHash);
    // console.log('getEventByHash signedBlock:', signedBlock.toString())
    // console.log('getEventByHash signedBlock:', signedBlock)
// 获取特定区块的所有事件
const allEvents = await api.query.system.events.at(blockHash);

// 遍历事件
allEvents.forEach((record) => {
  const { event , phase} = record;
  console.log(`Event ${event.section}.${event.method}: ${event.data.toString()}`);
//   console.log('phase:', phase);
  // 处理事件
});


}

 async function getBalances  (api, addr) {

    const addresses = [addr ];

    try {
      const unsub = await api.query.system.account.multi(addresses, balances => {
        const balancesMap = addresses.reduce(
          (acc, address, index) => ({
            ...acc,
            [address]: balances[index].data.free.toString(),
          }),
          {}
        )
        const balancesMap2 = addresses.reduce(
          (acc, address, index) => ({
            ...acc,
            [address]: balances[index].data.free.toHuman(),
          }),
          {}
        )
        console.log('balances:', balancesMap);
        
      })
      unsub();
    } catch(e) {
      console.error('get balance error:', e);
  
    }
  }
    

  async function getBalance  (api, address) {


    try {
      // 查询指定地址的账户余额
  const { data: balance } = await api.query.system.account(address);

  console.log(`Free balance of ${address} is ${balance.free}`);
  console.log(`Reserved balance of ${address} is ${balance.reserved}`);

    } catch(e) {
      console.error('get balance error:', e);
  
    }
  }
async function main() {
  const api = await loadCloverApi();
//   await bluebird.delay(1000);
await delay(1000);

  const signer = keyring.addFromUri(config.account);
  await checkAccountBalance(api, signer.address)
//   console.log('signer:', signer);
  // mint token
  // await deploy(api, signer);
  // await tickerInfo(api, "TABA")
  // await mint(api, signer);
  // await balanceOf('TABA', api, signer)
  await getBalance(api, signer.address);
  await getBalance(api, '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy');
    // await getEventByHash(api, '0x025ac8d2beeeb369733e725e04e0b6bcf59bf3a47b6534439b79bd466e4ec468');
}

main().then(res => {
  process.exit(0)
})
