// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Counter - 用于 E2E 测试的简单计数器合约
contract Counter {
    uint256 public count;

    event Incremented(uint256 newVal);

    /// 计数器加 1，触发 Incremented 事件
    function increment() public {
        count++;
        emit Incremented(count);
    }

    /// 读取当前计数
    function getCount() external view returns (uint256) {
        return count;
    }
}
