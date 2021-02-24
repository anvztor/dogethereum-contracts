const hre = require("hardhat");

const deploy = require('../deploy');

const utils = require('./utils');


contract('testDogeTokenDoUnlock', function(accounts) {
  let dogeToken;
  let snapshot;
  before(async function() {
    const dogethereum = await deploy.deployFixture(hre);
    dogeToken = dogethereum.dogeToken;
    snapshot = await hre.network.provider.request({method: "evm_snapshot", params: []});
  });
  after(async function() {
    await hre.network.provider.request({method: "evm_revert", params: [snapshot]});
  });
  it('doUnlock does not fail', async () => {
    const operatorPublicKeyHash = `0x4d905b4b815d483cdfabcd292c6f86509d0fad82`;
    const operatorEthAddress = accounts[3];
    await dogeToken.addOperatorSimple(operatorPublicKeyHash, operatorEthAddress);

    await dogeToken.assign(accounts[0], 2000000000);
    let balance = await dogeToken.balanceOf(accounts[0]);
    assert.equal(balance, 2000000000, `DogeToken's ${accounts[0]} balance is not the expected one`);

    await dogeToken.addUtxo(operatorPublicKeyHash, 2000000000, 1, 10);
    const utxo = await dogeToken.getUtxo(operatorPublicKeyHash, 0);
    assert.equal(utxo[0].toNumber(), 2000000000, `Utxo value is not the expected one`);

    const dogeAddress = utils.base58ToBytes20("DHx8ZyJJuiFM5xAHFypfz1k6bd2X85xNMy");
    await dogeToken.doUnlock(dogeAddress, 1000000000, operatorPublicKeyHash);

    const unlockPendingInvestorProof = await dogeToken.getUnlockPendingInvestorProof(0);
    assert.equal(unlockPendingInvestorProof[0], accounts[0], `Unlock from is not the expected one`);
    assert.equal(unlockPendingInvestorProof[1], dogeAddress, `Unlock doge address is not the expected one`);
    assert.equal(unlockPendingInvestorProof[2].toNumber(), 1000000000, `Unlock value is not the expected one`);
    assert.equal(unlockPendingInvestorProof[3].toNumber(), 10000000, `Unlock operator fee is not the expected one`);
    assert.equal(unlockPendingInvestorProof[5][0], 0, `Unlock selectedUtxos is not the expected one`);
    assert.equal(unlockPendingInvestorProof[6].toNumber(), 150000000, `Unlock fee is not the expected one`);
    assert.equal(unlockPendingInvestorProof[7], operatorPublicKeyHash, `Unlock operatorPublicKeyHash is not the expected one`);

    balance = await dogeToken.balanceOf(accounts[0]);
    assert.equal(balance.toNumber(), 1000000000, `DogeToken's user balance after unlock is not the expected one`);

    const operatorTokenBalance = await dogeToken.balanceOf(operatorEthAddress);
    assert.equal(operatorTokenBalance.toNumber(), 10000000, `DogeToken's operator balance after unlock is not the expected one`);

    const unlockIdx = await dogeToken.unlockIdx();
    assert.equal(unlockIdx, 1, 'unlockIdx is not the expected one');

    const operator = await dogeToken.operators(operatorPublicKeyHash);
    assert.equal(operator[1].toString(10), 0, 'operator dogeAvailableBalance is not the expected one');
    assert.equal(operator[2].toString(10), 1010000000, 'operator dogePendingBalance is not the expected one');
    assert.equal(operator[3], 1, 'operator nextUnspentUtxoIndex is not the expected one');
  });
});
