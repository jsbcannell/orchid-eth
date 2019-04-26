var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {

    // fix for "More than one instance of bitcore-lib found. Please make sure to require bitcore-lib and check that submodules do not also include their own bitcore-lib dependency"
    // https://github.com/bitpay/bitcore/issues/1457#issuecomment-467594031
    Object.defineProperty(global, '_bitcore', { get(){ return undefined }, set(){} });

  deployer.deploy(Migrations);
};
