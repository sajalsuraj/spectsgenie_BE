<!-- /.content-wrapper -->
<?php
$link = $_SERVER['REQUEST_URI'];
$link_array = explode('/', $link);
$page = end($link_array);
$roles = [];
?>
<?php if ($page !== "login" && $page !== "forgot-password") { ?>
    <footer class="main-footer">
        <div class="float-right d-none d-sm-block">
            <b>Version</b> 3.2.0
        </div>
        <strong>Copyright &copy; 2023 <a href="">SpectsGenie</a>.</strong> All rights reserved.
    </footer>

    <!-- Control Sidebar -->
    <aside class="control-sidebar control-sidebar-dark">
        <!-- Control sidebar content goes here -->
    </aside>
    <!-- /.control-sidebar -->
<?php } ?>
</div>
<!-- ./wrapper -->

</body>

</html>