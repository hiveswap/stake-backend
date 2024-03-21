export const abi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      {
        name: 'liquidityPool',
        type: 'address',
        internalType: 'contract MockLiquidityPool',
      },
      { name: 'lockedBlockNum', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'stake',
    inputs: [
      { name: 'token', type: 'address', internalType: 'contract IERC20' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateStakeBlockNum',
    inputs: [
      { name: 'newStakeBlockNum', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Stake',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      {
        name: 'userInfo',
        type: 'tuple',
        indexed: false,
        internalType: 'struct IStake.UserInfo',
        components: [
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
          {
            name: 'tokenAddr',
            type: 'address',
            internalType: 'contract IERC20',
          },
          { name: 'lpToken', type: 'uint256', internalType: 'uint256' },
          { name: 'stakeBlockNum', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      {
        name: 'userInfo',
        type: 'tuple',
        indexed: false,
        internalType: 'struct IStake.UserInfo',
        components: [
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
          {
            name: 'tokenAddr',
            type: 'address',
            internalType: 'contract IERC20',
          },
          { name: 'lpToken', type: 'uint256', internalType: 'uint256' },
          { name: 'stakeBlockNum', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'NoStake',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
];
