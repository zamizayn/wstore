const a = () => { b(); };
const b = () => { console.log("b called"); };
a();
