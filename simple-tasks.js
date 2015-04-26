// simple-todos.js

Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
    Meteor.subscribe("tasks");
    // This code only runs on the client
    Template.body.helpers({
        tasks: function () {
            if (Session.get("hideCompleted")) {
                // If hide completed is checked, filter tasks
                return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
            } else {
                // Otherwise, return all of the tasks
                return Tasks.find({}, {sort: {createdAt: -1}});
            }
        },

        hideCompleted: function () {
            return Session.get("hideCompleted");
        },

        incompleteCount: function () {
            return Tasks.find({checked: {$ne: true}}).count();
        }

    });

    Template.body.onRendered(function () {
        console.log("Document ready!");
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
        }
    });

    Template.task_input.events({
        "submit .new-task": function (event) {
            // This function is called when the new task form is submitted

            var text = event.target.text.value;

            Meteor.call("addTask", text);

            // Clear form
            event.target.text.value = "";

            // Prevent default form submit
            return false;
        }
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
    addTask: function (text) {
        // Make sure the user is logged in before inserting a task
        if (! Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Tasks.insert({
            text: text,
            createdAt: new Date(),
            owner: Meteor.userId()
        });
    },
    deleteTask: function (taskId) {
        Tasks.remove(taskId);
    },
    setChecked: function (taskId, setChecked) {
        Tasks.update(taskId, { $set: { checked: setChecked} });
    }
});


// At the bottom of simple-todos.js
if (Meteor.isServer) {
    Meteor.publish("tasks", function () {
        return Tasks.find({owner: this.userId});
    });
}

