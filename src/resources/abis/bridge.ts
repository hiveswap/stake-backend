export const BridgeABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_newRouter',
        type: 'address',
      },
    ],
    name: 'SetButterRouterAddress',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'fromChain',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'toChain',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'from',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'mapDepositOut',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'fromChain',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'toChain',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'from',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'toAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amountOut',
        type: 'uint256',
      },
    ],
    name: 'mapSwapIn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'fromChain',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'toChain',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'token',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'from',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'to',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'swapData',
        type: 'bytes',
      },
    ],
    name: 'mapSwapOut',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'fromChain',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'toChain',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'token',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'from',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'to',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'toChainToken',
        type: 'bytes',
      },
    ],
    name: 'mapTransferOut',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
    ],
    name: 'depositNative',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'depositToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_sender',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_to',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: '_toChain',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: '_swapData',
        type: 'bytes',
      },
    ],
    name: 'swapOutNative',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_token',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: '_to',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_toChain',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: '_swapData',
        type: 'bytes',
      },
    ],
    name: 'swapOutToken',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderId',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
