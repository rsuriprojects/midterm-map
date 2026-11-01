// Race data for the 2026 midterm map.
//
// Ratings: SD Solid D, LkD Likely D, LD Lean D, TU Toss Up, LR Lean R, LkR Likely R, SR Solid R
// Ratings come from the Cook Political Report (Senate Oct 30, governors Oct 29, 2026).
//
// On election night, add a `result` to a race and the map switches that state to results:
//   result: { d: 51.2, r: 47.1, i: 0, reporting: 88, called: "D" }   // called: "D" | "R" | "I" | null

window.ELECTION = {
  updated: "2026-11-01",
  electionDay: "2026-11-03",
  firstPollsClose: "2026-11-03T23:00:00Z", // 6pm ET, parts of IN and KY

  senate: {
    // Seats not on the ballot this year (Democrats include the 2 independents who caucus with them)
    holdover: { D: 34, R: 31 },
    majority: 51, // VP Vance breaks 50-50 ties for Republicans
    races: {
      AL: { held: "R", open: true, d: "Everett Wess", r: "Barry Moore", rating: "SR" },
      AK: { held: "R", d: "Mary Peltola", r: "Dan Sullivan", inc: "R", rating: "TU",
            poll: "Peltola led October polls by 2 to 7 points; September polls were tied or showed Sullivan slightly ahead." },
      AR: { held: "R", d: "Hallie Shoffner", r: "Tom Cotton", inc: "R", rating: "SR" },
      CO: { held: "D", d: "John Hickenlooper", r: "Mark Baisley", inc: "D", rating: "SD" },
      DE: { held: "D", d: "Chris Coons", r: "Michael Katz", inc: "D", rating: "SD" },
      FL: { held: "R", special: true, d: "Angie Nixon", r: "Ashley Moody", inc: "R", rating: "LkR" },
      GA: { held: "D", d: "Jon Ossoff", r: "Mike Collins", inc: "D", rating: "LkD",
            poll: "Ossoff +9.5 in the Poliwave polling average." },
      ID: { held: "R", r: "Jim Risch", i: "Todd Achilles", inc: "R", rating: "SR",
            note: "The Democratic nominee withdrew, leaving independent Todd Achilles as the main challenger." },
      IL: { held: "D", open: true, d: "Juliana Stratton", r: "Don Tracy", rating: "SD" },
      IA: { held: "R", open: true, d: "Josh Turek", r: "Ashley Hinson", rating: "TU",
            note: "Open seat after Joni Ernst retired. Cook moved it to Toss Up in August." },
      KS: { held: "R", d: "Adam Hamilton", r: "Roger Marshall", inc: "R", rating: "TU",
            note: "Moved to Toss Up on Oct 6 after early October polls tightened." },
      KY: { held: "R", open: true, d: "Charles Booker", r: "Andy Barr", rating: "SR",
            note: "Open seat after Mitch McConnell retired." },
      LA: { held: "R", open: true, d: "Jamie Davis", r: "Julia Letlow", rating: "SR",
            note: "Bill Cassidy lost the Republican primary to Letlow." },
      ME: { held: "R", d: "Troy Jackson", r: "Susan Collins", inc: "R", rating: "TU",
            poll: "Jackson 49, Collins 45 (CNN). Data for Progress also had Jackson ahead by 5.",
            note: "Jackson replaced Graham Platner as the Democratic nominee." },
      MA: { held: "D", d: "Ed Markey", r: "John Deaton", inc: "D", rating: "SD" },
      MI: { held: "D", open: true, d: "Abdul El-Sayed", r: "Mike Rogers", rating: "TU",
            poll: "El-Sayed led 11 of 12 October polls, by 1 to 7 points." },
      MN: { held: "D", open: true, d: "Peggy Flanagan", r: "Michele Tafoya", rating: "LkD" },
      MS: { held: "R", d: "Scott Colom", r: "Cindy Hyde-Smith", inc: "R", rating: "LkR" },
      MT: { held: "R", open: true, d: "Alani Bankhead", r: "Kurt Alme", i: "Seth Bodnar", rating: "SR",
            note: "Independent Seth Bodnar has support from former state Democratic leaders." },
      NE: { held: "R", r: "Pete Ricketts", i: "Dan Osborn", inc: "R", rating: "LR",
            note: "No Democrat on the ballot. The state party endorsed independent Dan Osborn, who lost a 2024 Senate race by 6.7 points." },
      NH: { held: "D", open: true, d: "Chris Pappas", r: "John E. Sununu", rating: "LD",
            note: "Moved from Toss Up to Lean D on Oct 6." },
      NJ: { held: "D", d: "Cory Booker", r: "Justin Murphy", inc: "D", rating: "SD" },
      NM: { held: "D", d: "Ben Ray Luján", r: "Larry Marker", inc: "D", rating: "SD" },
      NC: { held: "R", open: true, d: "Roy Cooper", r: "Michael Whatley", rating: "LkD",
            poll: "Cooper 51, Whatley 43 in a recent poll listed by RealClearPolling." },
      OH: { held: "R", special: true, d: "Sherrod Brown", r: "Jon Husted", inc: "R", rating: "TU",
            poll: "Brown has led most polls since early October, by 2 to 6 points." },
      OK: { held: "R", open: true, d: "N'Kiyla Jasmine Thomas", r: "Kevin Hern", rating: "SR" },
      OR: { held: "D", d: "Jeff Merkley", r: "David Brock Smith", inc: "D", rating: "SD" },
      RI: { held: "D", d: "Jack Reed", r: "Raymond McKay", inc: "D", rating: "SD" },
      SC: { held: "R", open: true, d: "Annie Andrews", r: "Darline Graham", rating: "LR",
            poll: "Andrews 42, Graham 39 in one Democratic-leaning August poll.",
            note: "Graham won the August 25 Republican runoff over Ralph Norman." },
      SD: { held: "R", r: "Mike Rounds", i: "Brian Bengs", inc: "R", rating: "SR",
            note: "The Democratic nominee withdrew." },
      TN: { held: "R", d: "Marquita Bradshaw", r: "Bill Hagerty", inc: "R", rating: "SR" },
      TX: { held: "R", open: true, d: "James Talarico", r: "Ken Paxton", rating: "TU",
            poll: "Talarico 49, Paxton 43 (CNN). Poliwave's average has Talarico up about 2.9.",
            note: "John Cornyn lost the Republican runoff to Paxton." },
      VA: { held: "D", d: "Mark Warner", r: "Bert Mizusawa", inc: "D", rating: "SD" },
      WV: { held: "R", d: "Rachel Fetty Anderson", r: "Shelley Moore Capito", inc: "R", rating: "SR" },
      WY: { held: "R", open: true, d: "James W. Byrd", r: "Harriet Hageman", rating: "SR" }
    }
  },

  governor: {
    // Governorships not on the ballot this year
    holdover: { D: 6, R: 8 },
    holdoverStates: { DE: "D", IN: "R", KY: "D", LA: "R", MS: "R", MO: "R", MT: "R", NJ: "D",
                      NC: "D", ND: "R", UT: "R", VA: "D", WA: "D", WV: "R" },
    majority: 26,
    races: {
      AL: { held: "R", open: true, d: "Doug Jones", r: "Tommy Tuberville", rating: "SR" },
      AK: { held: "R", open: true, d: "Jonathan Kreiss-Tomkins", r: "Bernadette Wilson", rating: "LD",
            note: "Top-four primary with a ranked-choice general election. Cook moved it to Lean D on Oct 13." },
      AZ: { held: "D", d: "Katie Hobbs", r: "Andy Biggs", inc: "D", rating: "LkD" },
      AR: { held: "R", d: "Fredrick Love", r: "Sarah Huckabee Sanders", inc: "R", rating: "SR" },
      CA: { held: "D", open: true, d: "Xavier Becerra", r: "Steve Hilton", rating: "SD" },
      CO: { held: "D", open: true, d: "Phil Weiser", r: "Victor Marx", rating: "SD" },
      CT: { held: "D", d: "Ned Lamont", r: "Ryan Fazio", inc: "D", rating: "SD" },
      FL: { held: "R", open: true, d: "David Jolly", r: "Byron Donalds", rating: "LR" },
      GA: { held: "R", open: true, d: "Keisha Lance Bottoms", r: "Rick Jackson", rating: "TU" },
      HI: { held: "D", d: "Josh Green", r: "Gary Cordery", inc: "D", rating: "SD" },
      ID: { held: "R", d: "Terri Pickens", r: "Brad Little", inc: "R", rating: "SR" },
      IL: { held: "D", d: "JB Pritzker", r: "Darren Bailey", inc: "D", rating: "SD" },
      IA: { held: "R", open: true, d: "Rob Sand", r: "Zach Lahn", rating: "LD" },
      KS: { held: "D", open: true, d: "Cindy Holscher", r: "Ty Masterson", rating: "TU",
            note: "Moved from Lean R to Toss Up on Oct 27." },
      ME: { held: "D", open: true, d: "Hannah Pingree", r: "Robert Charles", i: "Rick Bennett", rating: "SD" },
      MD: { held: "D", d: "Wes Moore", r: "Dan Cox", inc: "D", rating: "SD" },
      MA: { held: "D", d: "Maura Healey", r: "Mike Minogue", inc: "D", rating: "SD" },
      MI: { held: "D", open: true, d: "Jocelyn Benson", r: "John James", rating: "LD" },
      MN: { held: "D", open: true, d: "Amy Klobuchar", r: "Lisa Demuth", rating: "SD" },
      NE: { held: "R", d: "Lynne Walz", r: "Jim Pillen", inc: "R", rating: "LR",
            note: "Moved from Likely R to Lean R on Oct 27." },
      NV: { held: "R", d: "Aaron Ford", r: "Joe Lombardo", inc: "R", rating: "TU" },
      NH: { held: "R", d: "Cinde Warmington", r: "Kelly Ayotte", inc: "R", rating: "LkR" },
      NM: { held: "D", open: true, d: "Deb Haaland", r: "Gregg Hull", rating: "SD" },
      NY: { held: "D", d: "Kathy Hochul", r: "Bruce Blakeman", inc: "D", rating: "SD",
            poll: "Hochul ahead by roughly 11 to 14 points in October polls." },
      OH: { held: "R", open: true, d: "Amy Acton", r: "Vivek Ramaswamy", rating: "LD",
            note: "Moved from Toss Up to Lean D on Oct 23." },
      OK: { held: "R", open: true, d: "Cyndi Munson", r: "Mike Mazzei", rating: "LkR" },
      OR: { held: "D", d: "Tina Kotek", r: "Christine Drazan", inc: "D", rating: "LD" },
      PA: { held: "D", d: "Josh Shapiro", r: "Stacy Garrity", inc: "D", rating: "SD" },
      RI: { held: "D", open: true, d: "Helena Foulkes", rating: "SD",
            note: "Foulkes beat Gov. Dan McKee in the Democratic primary." },
      SC: { held: "R", open: true, d: "Jermaine Johnson", r: "Alan Wilson", rating: "SR" },
      SD: { held: "R", d: "Dan Ahlers", r: "Larry Rhoden", inc: "R", rating: "SR" },
      TN: { held: "R", open: true, d: "Jerri Green", r: "Marsha Blackburn", rating: "SR" },
      TX: { held: "R", d: "Gina Hinojosa", r: "Greg Abbott", inc: "R", rating: "LR",
            note: "Moved from Likely R to Lean R on Oct 1." },
      VT: { held: "R", d: "Amanda Janoo", r: "Phil Scott", inc: "R", rating: "LkR" },
      WI: { held: "D", open: true, d: "David Crowley", r: "Tom Tiffany", rating: "LD" },
      WY: { held: "R", open: true, d: "Kenneth Casner", r: "Eric Barlow", rating: "SR" }
    }
  }
};
