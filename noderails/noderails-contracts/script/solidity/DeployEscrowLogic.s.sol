// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/NodeRailsEscrowLogic.sol";

/// Deploys NodeRailsEscrowLogic alone. Tempo needs this: nesting `new Logic()` inside
/// Escrow creation puts both bytecodes in one tx and exceeds the 30M gas cap (TIP-1000).
contract DeployEscrowLogic is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        NodeRailsEscrowLogic deployed = new NodeRailsEscrowLogic();
        vm.stopBroadcast();
        console.log("NodeRailsEscrowLogic deployed at:", address(deployed));
    }
}
