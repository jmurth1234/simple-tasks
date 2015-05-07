// simple-todos.js

Tasks = new Mongo.Collection("tasks");
Tags = new Mongo.Collection("tags");

if (Meteor.isClient) {
    Meteor.subscribe("tasks");
    Meteor.subscribe("tags");
    // This code only runs on the client

    var tags;
    function getTags() {
        if (!tags) {
            tags = Tags.find({}, {sort: {createdAt: 1}});
        }
        return tags;
    }

    Template.body.helpers({
        tasks: function () {
            var tag = Session.get("currentTag");
            if (tag === undefined)
                tag = "all";

            if (tag === "all") {
                if (Session.get("hideCompleted")) {
                    // If hide completed is checked, filter tasks
                    var tasks = Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
                } else {
                    // Otherwise, return all of the tasks
                    var tasks = Tasks.find({}, {sort: {createdAt: -1}});
                }
            } else {
                if (Session.get("hideCompleted")) {
                    // If hide completed is checked, filter tasks
                    var tasks = Tasks.find({checked: {$ne: true}, tag: tag}, {sort: {createdAt: -1}});
                } else {
                    // Otherwise, return all of the tasks
                    var tasks = Tasks.find({tag: tag}, {sort: {createdAt: -1}});
                }
            }

            return tasks;
        },
        tags: getTags(),

        hideCompleted: function () {
            return Session.get("hideCompleted");
        },

        incompleteCount: function () {
            return Tasks.find({checked: {$ne: true}}).count();
        }

    });

    Template.body.onRendered(function () {
        $(".categories").sideNav();
        $('.modal-trigger').leanModal();
        $('.dropdown-button').dropdown({
                inDuration: 300,
                outDuration: 225,
                constrain_width: false, // Does not change width of dropdown to that of the activator
                hover: false, // Activate on hover
                gutter: 0, // Spacing from edge
                belowOrigin: false // Displays dropdown below the button
            }
        );
    });

    Template.body.events({
        "change #hideCompleted": function (event) {
            Session.set("hideCompleted", event.target.checked);
        },

        "click #logout": function (event) {
            Meteor.logout();
            location.hash = "";
        },

        "click .tag-sidebar": function (event) {
            var id = event.currentTarget.id;
            Session.set("currentTag", id);
        }

    });

    Template.task_input.events({
        "click #submit-btn": function (event) {
            // This function is called when the new task form is submitted

            var text = $("#task-input").val();

            var tag = $('#tag-option').val();

            var find = Tags.find({_id: tag});
            var find2 = Tags.find({text: $('#tag-input').val()});
            var fetch = find.fetch();
            var fetch2 = find2.fetch();
            if ((fetch[0] === undefined) && (fetch2[0] === undefined)) {
                Meteor.call("addTag", $('#tag-input').val(), function(err, data) {
                    if (err)
                        console.log(err);

                    var find = Tags.find({text: $('#tag-input').val()});
                    var fetch = find.fetch();
                    tag = fetch[0]._id;
                });
            }

            var enc_text = CryptoJS.AES.encrypt(text, Session.get("enc_key"));

            Meteor.call("addTask", enc_text.toString(), tag);

            // Clear form
            $("#task-input").blur();
            $("#task-input").val('');
            $("#tag-option").val('');
        },

        "change #tag-option": function (event) {
            $('#tag-input').val($("#tag-option").find(":selected").text());
        }
    });

    Template.task_input.onRendered(function () {
        $('.collapsible').collapsible({
            accordion : false // A setting that changes the collapsible behavior to expandable instead of the default accordion style
        });
    });

    Template.task_input.helpers({
        tags: getTags()
    });

    // In the client code, below everything else
    Template.task.events({
        "click .toggle-checked": function () {
            // Set the checked property to the opposite of its current value
            Meteor.call("setChecked", this._id, ! this.checked);
        },
        "click .delete": function () {
            Meteor.call("deleteTask", this._id);
        }
    });

    Template.task.helpers({
        decrypt: function(text) {
            return CryptoJS.AES.decrypt(text, Session.get("enc_key")).toString(CryptoJS.enc.Utf8);
        },
        getTag: function (tag) {
            var find = Tags.find({_id: tag});
            var fetch = find.fetch();
            if (fetch[0] !== undefined) {
                return fetch[0].text;
            } else {
                return "None";
            }
        }

    });

    Template.login.events({

        'click #login': function (e, t) {
            e.preventDefault();
            // retrieve the input field values
            var username = t.find('#username').value;
            var password = t.find('#password').value;

            // Trim and validate your fields here....

            // If validation passes, supply the appropriate fields to the
            // Meteor.loginWithPassword() function.
            Meteor.loginWithPassword(username, password, function (err) {
                if (err) {
                    $().toast('Login failed!', 4000);
                } else {
                    Session.setAuth("enc_key", CryptoJS.SHA256(username + password).toString());
                    $().toast('Login complete!', 4000);

                }
            });
            return false;
        },

        'click #signup': function (e, t) {
            e.preventDefault();
            // retrieve the input field values
            var username = t.find('#username').value;
            var password = t.find('#password').value;

            // Trim and validate your fields here....

            // If validation passes, supply the appropriate fields to the
            // Meteor.loginWithPassword() function.
            Accounts.createUser({username: username, password : password}, function (err) {
                if (err) {
                    console.log(err);
                    $().toast('Registration failed!', 4000);
                } else {
                    $().toast('Registration complete!', 4000);
                }
            });
            return false;
        }
    });
}

// At the bottom of simple-todos.js, outside of the client-only block
Meteor.methods({
    // task methods
    addTask: function (text, tag) {
        // Make sure the user is logged in before inserting a task
        if (! Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.insert({
            text: text,
            tag: tag,
            createdAt: new Date(),
            owner: Meteor.userId()
        });
    },
    deleteTask: function (taskId) {
        Tasks.remove(taskId);
    },
    setChecked: function (taskId, setChecked) {
        Tasks.update(taskId, { $set: { checked: setChecked} });
    },

    // tag methods
    addTag: function (text) {
        // Make sure the user is logged in before inserting a task
        if (! Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        var tag = Tags.insert({
            text: text,
            createdAt: new Date(),
            owner: Meteor.userId()
        });

        return tag._id;
    }
});


// At the bottom of simple-todos.js
if (Meteor.isServer) {
    Meteor.publish("tasks", function () {
        return Tasks.find({owner: this.userId});
    });

    Meteor.publish("tags", function () {
        return Tags.find({owner: this.userId});
    });

    // enable cors
    // Listen to incoming HTTP requests, can only be used on the server
    WebApp.connectHandlers.use(function(req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return next();
    });

}


Meteor.users.deny({
    update: function() {
        return true;
    }
});