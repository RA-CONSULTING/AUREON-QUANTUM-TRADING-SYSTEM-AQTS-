#!/bin/bash
###############################################################################
# 🦆⚡ HONEY HUNT SETUP ⚡🦆
# 
# Quick setup script to configure your Binance credentials
###############################################################################

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🦆⚡🍯 HONEY HUNT CONFIGURATION WIZARD 🍯⚡🦆"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✅ Found existing .env file"
    echo ""
    echo "Current configuration:"
    grep "BINANCE_" .env | sed 's/=.*/=***HIDDEN***/'
    echo ""
else
    echo "📝 No .env file found, will create one"
    echo ""
fi

echo "════════════════════════════════════════════════════════════════"
echo "  ⚠️  IMPORTANT: WHERE TO GET YOUR API KEYS ⚠️"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔐 FOR TESTNET (Practice with fake money - RECOMMENDED):"
echo "   1. Go to: https://testnet.binance.vision/"
echo "   2. Login with GitHub"
echo "   3. Generate API Key"
echo "   4. Save both API Key and Secret Key"
echo ""
echo "🔴 FOR MAINNET (Real money - BE CAREFUL!):"
echo "   1. Go to: https://www.binance.com/en/my/settings/api-management"
echo "   2. Create API Key"
echo "   3. Enable 'Enable Spot & Margin Trading'"
echo "   4. Add IP whitelist for security (optional but recommended)"
echo "   5. Save both API Key and Secret Key"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

read -p "Which network do you want to use? (testnet/mainnet): " NETWORK

if [ "$NETWORK" = "testnet" ]; then
    USE_TESTNET="true"
    echo "✅ Using TESTNET (safe practice mode)"
elif [ "$NETWORK" = "mainnet" ]; then
    USE_TESTNET="false"
    echo "🔴 Using MAINNET (REAL MONEY!)"
    echo ""
    read -p "⚠️  Are you SURE you want to use real money? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "👍 Smart choice! Use testnet first."
        exit 0
    fi
else
    echo "❌ Invalid choice. Please run again and choose 'testnet' or 'mainnet'"
    exit 1
fi

echo ""
read -p "Enter your Binance API Key: " API_KEY
read -p "Enter your Binance API Secret: " API_SECRET

if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
    echo "❌ API Key and Secret cannot be empty!"
    exit 1
fi

# Create or update .env file
cat > .env << EOF
# Binance API Configuration
BINANCE_API_KEY=${API_KEY}
BINANCE_API_SECRET=${API_SECRET}
BINANCE_TESTNET=${USE_TESTNET}

# Trading Configuration
CONFIRM_LIVE_TRADING=yes
DRY_RUN=false

# Honey Hunt Settings
INITIAL_HONEY_POT=10000
EOF

echo ""
echo "✅ Configuration saved to .env"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🎯 READY FOR WAR! 🎯"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Your setup:"
echo "   • Network: ${NETWORK}"
echo "   • API Key: ${API_KEY:0:8}...${API_KEY: -4}"
echo "   • Ready to collect honey: YES 🍯"
echo ""
echo "🚀 NEXT STEPS:"
echo ""
echo "   1. Check your wallet:"
echo "      npx tsx scripts/liveHoneyHunt.ts"
echo ""
echo "   2. Start hunting:"
echo "      npx tsx scripts/lionHuntEnhanced.ts"
echo ""
echo "   3. Or manual hunt:"
echo "      npx tsx scripts/rainbowArch.ts BTCUSDT --live"
echo ""
echo "🦆 'Time for war! Honey is victory!' - You, the Commander"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
