cd ./test/test-cli

CLI='node ../../cli'

echo Testing \`macro-test-file\`
$CLI macro -d ./macro-test/defs -t ./macro-test/infile

echo Testing \`macro-directory\`
$CLI macro -d ./macro-directory/defs -i ./macro-directory/source -o ./macro-directory/dist -e

echo Testing \`cjs-cli-mode\`
$CLI cli -f ./cjs-cli/echo.cjs
$CLI cli -f ./cjs-cli/zz.cjs

echo Testing \`cjs-server-yaf-plugin\`
$CLI cli -f ./cjs-server-yaf-plugin/index.cjs -u /
$CLI cli -f ./cjs-server-yaf-plugin/index.cjs -u /index/aa
