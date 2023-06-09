const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function(req) {
    const sessionToken = getSessionToken(req);
    if (!sessionToken) {
      return res.status(301).redirect('/');
    }
  
    const user = await db.select('*')
      .from('se_project.sessions')
      .where('token', sessionToken)
      .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
      .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
      .first();
   
    console.log('user =>', user)
    user.isStudent = user.roleid === roles.student;
    user.isAdmin = user.roleid === roles.admin;
    user.isSenior = user.roleid === roles.senior;
  
    return user;  
  }

module.exports = function (app) {
  // example
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });

};
//admin endpoints 
// station parts
  app.post("/api/v1/station", async function (req, res) {
    try {
      const admin = await getAdmin(req);
      const { stationName } = req.body;
  
      if (!stationName) {
        return res.status(400).json({ message: "Station name is required" });
      }
  
  
      const stationType = ["normal" , "transfer"] ;
      const stationPosition = ["start" , "middle" , "end"]
      const newStation = await db("se_project.stations").insert({
        stationname: stationName,
        stationposition: stationPosition, 
        stationstatus: "normal",
        stationtype: stationType, 
      });   
  
      return res.status(200).json({ message: "Station created successfully" });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Station cannot be created");
    }
  });
  app.put("/api/v1/station/:stationId", async function (req, res) {
    try {
      const admin = await getAdmin(req);
      const { stationName } = req.body;
      const stationId = parseInt(req.params.stationId);
      // check lw station exists 
      if (isNaN(stationId)) {
        return res.status(400).json({ message: "Invalid station ID, Please Re-Enter the ID" });
      }
  
      await db("se_project.stations")
        .where({ id: stationId })
        .update({ stationname: stationName });
  
      return res.status(200).json({ message: "Station updated successfully" });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Station could not be updated");
    }
  });
  //ziad 
  //delete stations
  app.delete("/api/v1/station/:stationId", async function (req, res) {
    try {
      const admin = await getAdmin(req);
      
      if (!admin) {
        return res.status(400).json({ message: "Unauthorized" });
      }
  
      const stationId = req.params.stationId;
  
      
      const station = await db("se_project.stations")
      .where({ id: stationId })
      .first();
  
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
  
    
      await db("se_project.stations").where({ id: stationId }).del();
  
      // Delete the connected routes
      const deletedRoutes = await db("se_project.routes")
        .where("fromStationid", stationId)
        .orWhere("toStationid", stationId)
        .del();
  
      // Create new routes and update their names
      const newRoutes = [];
      const updatedRoutes = [];
  
      if (deletedRoutes > 0) {
        const connectedRoutes = await db("se_project.routes")
          .where("fromStationid", stationId)
          .orWhere("toStationid", stationId);
  
        for (const route of connectedRoutes) {
          const newRoute = {
            fromStationid: route.fromStationid === stationId ? null : route.fromStationid,
            toStationid: route.toStationid === stationId ? null : route.toStationid,
            routeName: `new-${route.routeName}` // Update the route name
          };
  
          const createdRoute = await db("se_project.routes").insert(newRoute).returning("*");
          newRoutes.push(createdRoute);
          updatedRoutes.push(route.id);
        }
      }
  
  
      const stationRoutes = [];
      for (const newRoute of newRoutes) {
        const stationRoute = {
          stationId: stationId,
          routeId: newRoute.id
        };
        const createdStationRoute = await db("se_project.stationRoutes").insert(stationRoute).returning("*");
        stationRoutes.push(createdStationRoute);
      }
  
      await db("se_project.stationRoutes")
        .whereIn("routeId", updatedRoutes)
        .update({ routeName: `new-${route.routeName}` });
  
      return res.status(200).json({ message: "Station and associated routes deleted successfully" });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not delete station");
    }
  });
  
  
  

  // dani
//route parts
app.post("/api/v1/route", async (req, res) => {
  try {
    const { newStationId, connectedStationId, routeName } = req.body;

    // b checl stations mawgooda wla laa fl table
    const newStation = await db("se_project.stations")
      .where("id", newStationId)
      .first();

    const connectedStation = await db("se_project.stations")
      .where("id", connectedStationId)
      .first();

    if (!newStation || !connectedStation) {
      return res.status(404).send("One or more stations do not exist");
    }

  

    let newStationPosition, connectedStationPosition;

    // Check if the connected station is at the start of a route
    const connectedToStart = await db("se_project.routes")
      .where("fromstationid", connectedStationId)
      .first();

    if (connectedToStart) {
      newStationPosition = "end";
      connectedStationPosition = "start";
    } else {
      newStationPosition = "start";
      connectedStationPosition = "end";
    }

    // Create the new route
    const newRoute = await db("se_project.routes")
      .insert({
        routename: routeName,
        fromstationid: newStationId,
        tostationid: connectedStationId
      })
      .returning("*");


    await db("se_project.stations")
      .where("id", newStationId)
      .update({ stationposition: newStationPosition });

    await db("se_project.stations")
      .where("id", connectedStationId)
      .update({ stationposition: connectedStationPosition });

    return res.status(201).send("route created successfully : ").json(newRoute);
  } catch (err) {
    console.log("error message", err.message);
    return res.status(500).send("Cannot create route, Please Try Again");
  }
});

  
app.put("/api/v1/route/:routeId", async function (req, res) {
  try {
    const { routeName } = req.body;
    const { routeId } = req.params;
    const route = await db("se_project.routes").where({ id: routeId }).first();
    if (!route) {
      return res.status(404).send("Route not found");
    }
    const updatedRoute = await db("se_project.routes")
      .update({ routename: routeName })
      .where({ id: routeId });

    if (updatedRoute === 1) {
      return res.status(200).json({ message: "Route updated successfully" });
    }
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not update route");
  }
});
app.delete("/api/v1/route/:routeId", async function(req, res) {
  try {
    const { routeId } = req.params;

  
    const routeExists = await db("se_project.routes").where({ id: routeId }).first();
    if (!routeExists) {
      return res.status(404).send("Cannot find Route, thus cannot be deleted");
    }

  
    await db("se_project.routes").where({ id: routeId }).del();

    
    const { fromstationid, tostationid } = routeExists;

   // check lw el stations lesa feeha routes
    const fromStationRoutes = await db("se_project.routes").where({ fromstationid });
    const toStationRoutes = await db("se_project.routes").where({ tostationid });

    
    if (fromStationRoutes.length === 0) {
      await db("se_project.stations").where({ id: fromstationid }).update({ stationposition: null });
    }
    if (toStationRoutes.length === 0) {
      await db("se_project.stations").where({ id: tostationid }).update({ stationposition: null });
    }

    return res.status(200).json({ message: "Route deletion completed" });
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Route couldn't be deleted");
  }
});

app.put("/api/v1/requests/refunds/:requestId", async function(req, res) {
  try {
    const { refundStatus } = req.body;
    const requestId = parseInt(req.params.requestId, 10);

    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid requestId" });
    }

    const refundRequest = await db("se_project.refund_requests")
      .where({ id: requestId })
      .first();

    if (!refundRequest) {
      return res.status(404).json({ message: "Refund request not found" });
    }

    await db("se_project.refund_requests")
      .where({ id: requestId })
      .update({ status: refundStatus });

    if (refundStatus === "accepted") {
      const ticket = await db("se_project.tickets")
        .where({ id: refundRequest.ticketid })
        .first();
      //checking in el trip lsa fl future, is yes hn delete-ha
      if (ticket && ticket.tripdate > new Date()) {
        await db("se_project.tickets")
          .where({ id: refundRequest.ticketid })
          .del();

        if (ticket.subid) {
          const subscription = await db("se_project.subscription")
            .where({ id: ticket.subid })
            .first();

          if (subscription) {
            const validSubscription = await db("se_project.subscription")
              .where({ id: ticket.subid })
              .update({ numTickets: subscription.nooftickets + 1 });

            if (validSubscription === 1) { //checking subscription 
              return res.status(200).json({ message: "Subscription: valid, Refund completed successfully" });
            } else {
              return res.status(500).json({ message: "Refund failed" });
            }
          } else {
            return res.status(404).json({ message: "No subscription to be found, thus cannot perform refund request" });
          }
        } else {
          const transaction = await db("se_project.transactions")
            .where({ id: ticket.transactionid })
            .first();

          if (transaction) {   
            const completedTransaction = await db("se_project.transactions")
              .where({ id: ticket.transactionid })
              .update({ amount: 0 });

            if (completedTransaction === 1) {
              return res.status(200).json({ message: "Transaction: found, Refund completed successfully" });
            } else {
              return res.status(404).json({ message: "No transaction with the specified ID to be found, thus cannot perform refund request" });
            }
          }
        }
      }
    } else {
      return res.status(200).json({ message: "Refund request rejected" });
    }

    return res.status(200).json({ message: "Refund request completed successfully" });
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not complete refund request");
  }
});


 app.put("/api/v1/requests/senior/:requestId", async function(req, res) {
  try {
    const { seniorStatus } = req.body;
    const requestId = parseInt(req.params.requestId, 10);
     
    if(isNaN(requestId)){
      return res.status(400).json({message: "Invalid Request Id, Please Try again"});
    }
    // fetching or chekcing lw fi refund request
    const seniorRequest = await db("se_project.senior_requests")
    .where({id:requestId})
    .first();
    if(!seniorRequest){
      return res.status(404).json({message: "Cannot find senior request"});
    }

    if (seniorStatus === "accepted"){
      await db ("se_project.senior_requests")
      .where({id:requestId})
      .update({status : seniorStatus})
      return res.status(201).json({message: "Senior Request accepted succefully"});
    }else if (seniorStatus === "rejected"){
      await db ("se_project.senior_requests")
      .where({id:requestId})
      .update({status : seniorStatus})
      return res.status(201).json({message: "Senior Request rejected succefully"});
    }else {
      return res.status(400).json({ message: "Invalid seniorStatus value" });
    }
  }catch(e) {
    console.log(e.message);
    return res.status(400).send("Couldn't review Request");
  }
});

app.put("/api/v1/zones/:zoneId", async function(req, res) {
  try {
    const { price } = req.body;
    const zoneId = parseInt(req.params.zoneId, 10);

    if (isNaN(zoneId)) {
      return res.status(400).json({ message: "Invalid zoneId" });
    }

    const zone = await db("se_project.zones")
      .where({ id: zoneId })
      .first();

    if (!zone) {
      return res.status(404).json({ message: "Cnnot find specified zone, please try again" });
    }

    await db("se_project.zones")
      .where({ id: zoneId })
      .update({ price: price });

    return res.status(200).json({ message: "Zone price updated successfully" });
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Zone price couldnt be updated");
  }
});