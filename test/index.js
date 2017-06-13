const junit = require("junit");
const cbfree = require("../lib/index");

const it = junit();
const { eq } = it;

it.describe("basic", it => {
  /*
  it("test no argument in callback", () => {
    let source = "function foo() { let () @= bar(); console.log(\"hello\"); }";
    let target = "function foo() {    bar(() => { console.log(\"hello\"); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  */
  it("test one argument without type in callback function", () => {
    let source = "function foo() { let e @= bar(); console.log(e); }";
    let target = "function foo() {    bar((e) => { console.log(e); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  it("test one argument with type in callback function", () => {
    let source = "function foo() { let e: Error @= bar(); console.log(e); }";
    let target = "function foo() {    bar((e: Error) => { console.log(e); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  it("test two argument without type in callback function", () => {
    let source = "function foo() { let e, str @= bar(); console.log(str); }";
    let target = "function foo() {    bar((e, str) => { console.log(str); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  it("test two argument with type in callback function", () => {
    let source = "function foo() { let e: Error, str: string @= bar(); console.log(str); }";
    let target = "function foo() {    bar((e: Error, str: string) => { console.log(str); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  it("test one argument without type in callback function before one argument in calling function", () => {
    let source = "function foo() { let e @= bar(*, \"hello\"); console.log(e); }";
    let target = "function foo() {    bar((e) => { console.log(e); }, \"hello\");}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  it("test one argument without type in callback function after one argument in calling function", () => {
    let source = "function foo() { let e @= bar(\"hello\"); console.log(e); }";
    let target = "function foo() {    bar(\"hello\", (e) => { console.log(e); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
});

it.describe("blocks", it => {
  it("test multi-statements in callback function", () => {
    let source = "function foo() { let e, str @= bar(); if (e) console.log(e); else console.log(str); }";
    let target = "function foo() {    bar((e, str) => { if (e)        console.log(e);    else        console.log(str); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  it("test multi-statements before callback statement", () => {
    let source = "function foo() { let str = \"hello\"; let e @= bar(); if (e) console.log(e); else console.log(str); }";
    let target = "function foo() {    let str = \"hello\";    bar((e) => { if (e)        console.log(e);    else        console.log(str); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
  it("test nested callback statements", () => {
    let source = "function foo() { let e @= bar(); let str @= moo(); if (e) console.log(e); else console.log(str); }";
    let target = "function foo() {    bar((e) => { moo((str) => { if (e)        console.log(e);    else        console.log(str); }); });}";
    return eq(cbfree.transform(source).replace(/\n/g, "") , target);
  });
});

it.run();
