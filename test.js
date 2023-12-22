const { Keyring } = require('@polkadot/keyring');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const cloverTypes = require('@clover-network/node-types');
const BN = require('bn.js');
// const _ = require('lodash');
// const fs = require('fs');
const prompts = require('prompts');
const bluebird = require('bluebird');
const { checkAddress } = require('@polkadot/util-crypto');
const BigNumber = require('bignumber.js');
const config = require('./.env.json');
console.log('config:', config);

const keyring = new Keyring({
  ss58Format: 42,
  type: 'sr25519',
});


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
  await bluebird.delay(1000);

  const signer = keyring.addFromUri(config.account);
  await checkAccountBalance(api, signer.address)

  // mint token
  await deploy(api, signer);
  await tickerInfo(api, "RGBX")
}

async function tickerInfo(api, name) {
  const result = await api.query.cloverCrc20.tickInfo(name);
  console.log(result.toString())
}

async function deploy(api, signer) {
  const max = "1000000000000000000000";
  const limit = "100000000000000000000";
  const nonce = await api.rpc.system.accountNextIndex(signer.address);
  const signedTransaction = await api.tx.cloverCrc20
    .deploy("TEST2", max, limit)
    .sign(signer, { nonce });
  const result = await signedTransaction.send();
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

main().then(res => {
  process.exit(0)
})
