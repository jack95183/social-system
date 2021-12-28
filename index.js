// 資料庫連線
const mongo=require("mongodb");
const uri="mongodb+srv://root:a123456@cluster0.2stzz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
const client=new mongo.MongoClient(uri);
let db=null;
client.connect(async function(err){
    //判斷是否連線成功
    if(err){
        console.log("資料庫連線失敗", err);
        return;
    }
    db=client.db("social-system");
    console.log("資料庫連線成功");
});
//網站伺服器設定
const express=require("express");
const app=express();
const session=require("express-session");
app.use(session({
    secret:"mysecret",
    resave:false,
    saveUninitialized:true
}));
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"))
app.use(express.urlencoded({extended:true}));
// 路由設定
app.get("/", function(req, res){
    res.render("index.ejs");
});
app.get("/member", async function(req, res){
    //檢查使用者是否有透過登入程序，進入會員頁
    if(!req.session.member){
        res.redirect("/");
        return;
    }
    //從session 取得登入會員的名稱
    const name=req.session.member.name;
    //取得所有留言
    const collection=db.collection("message");
    let result=await collection.find({}).sort({
        _id:-1
    });
    let data=[];
    await result.forEach(function(message){
        data.push(message);
    });
    
    res.render("member.ejs", {name:name, data:data});  
});
// 連線到 /error?msg=錯誤訊息
app.get("/error", function(req, res){
    const msg=req.query.msg;
    res.render("error.ejs", {msg:msg});
});
//登出會員功能的路由
app.get("/signout", function(req, res){
    req.session.member=null;
    res.redirect("/");
});
//登入會員功能的路由
app.post("/signin", async function(req, res){
    const email=req.body.email;
    const password=req.body.password;
    //檢查資料庫中的資料
    const collection=db.collection("member");
    let result=await collection.findOne({
        $and:[
            {email:email},
            {password:password}
        ]
    });
    if(result===null){ //沒有對應的會員資料，登入失敗
        res.redirect("/error?msg=登入失敗，郵件或密碼輸入錯誤");
        return;
    }
    //登入成功，紀錄會員資訊在Session中
    req.session.member=result;
    res.redirect("/member");
});
//註冊會員功能的路由
app.post("/signup", async function(req, res){
    const name=req.body.name;
    const email=req.body.email;
    const password=req.body.password;
    //檢查資料庫中的資料
    const collection=db.collection("member");
    let restlt=await collection.findOne({
        email:email
    });
    if(restlt!==null){ //Email已經存在
        res.redirect("/error?msg=註冊失敗，信箱重複");
        return;
    }
    //將新的會員資料放到資料庫
    result=await collection.insertOne({
        name:name, email:email, password:password
    });
    //新增成功，導回首頁
    res.redirect("/");
});
app.post("/add", async function(req, res){
    const message=req.body.message;
    const collection=db.collection("message");
    const name=req.session.member.name;
    if(!req.session.member){
        res.redirect("/");
        return;
    }
    //將新的留言資料放到資料庫
    let result=await collection.insertOne({
        name:name, message:message
    });
    //新增成功，導回首頁
    res.redirect("/member");
});
//啟動伺服器 http://localhost:3000/
app.listen(3000, function(){
    console.log("Server Started");
});